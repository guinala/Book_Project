# Solución: Fix caché multi-idioma + Escritura bilingüe proactiva

Documento de referencia sobre cómo se resolvió el problema de idioma en Firestore y localStorage.
El plan original está en `2026-04-28-language-cache-fix.md`.

---

## Resumen del problema

Los datos de la app (sinopsis, bio de autores, títulos de libros) se guardaban en Firestore
sin separación por idioma. El primer usuario en visitar un recurso determinaba el idioma
de ese dato para todos los usuarios futuros.

**Solución original (lazy enrich):** se guardaba en el idioma actual y, cuando un usuario con
otro idioma leía el dato, se buscaba y rellenaba en background. El primer usuario de cada
idioma siempre tenía datos incompletos.

**Solución actual (proactiva):** al guardar un libro en Firebase, se buscan título, ISBN y
sinopsis para **ambos idiomas** (ES y EN) de una vez, priorizando español. Al leer, si el
dato del idioma actual falta, se re-intenta en background. El campo `title` plano fue
eliminado de la escritura (solo `titles.{lang}`).

---

## Arquitectura de cachés

```
OpenLibrary / Google Books / Wikipedia
          ↓
    Firestore (caché largo plazo, sin TTL)
          ↓
    localStorage (caché corto plazo, TTL 24h, clave por idioma)
          ↓
    Estado React (memoria de sesión)
```

---

## Flujos principales

### Flujo de escritura (proactivo)
```
API (idioma actual) → Book con title=<idioma actual>
  ↓
saveBooksToDB:
  1. batch.set → datos base SIN title plano
  2. updateBookTitleToDB(key, title, lang, isbn) → titles.{lang}, isbns.{lang}, langs+=[lang]
  3. Background: fetchWorkEditionByLang(key, otherLang)
     → updateBookTitleToDB(key, otherTitle, otherLang, otherIsbn) → titles.{otherLang}, langs+=[otherLang]
```

### Flujo de lectura
```
getExploreBooksFromDB / getAuthorBooksFromDB / getShelf:
  title = titles[lang] ?? titles.es ?? titles.en ?? title(legacy) ?? ""
  ↓
Si titles[lang] es null → enrichTitles (background) → fetchWorkEditionByLang → updateBookTitleToDB
```

### Flujo sinopsis (proactivo)
```
useBookDetail:
  1. getSynopsisFromDB(id, lang) → hit? → mostrar
  2. miss? → fetchGoogleSynopsis(lang) → mostrar + saveSynopsisToDB(lang)
  3. Background: getSynopsisFromDB(id, otherLang) → miss? → fetchGoogleSynopsis(otherLang) → saveSynopsisToDB(otherLang)
```

---

## Solución por dominio

### Títulos de libros por idioma (`firebaseBooks.ts`, `openLibraryApi.ts`, `useExploreBooks.ts`)

**Esquema Firestore:**
```
Books/OL123W:
  titles:
    es: "El Nombre del Viento"
    en: "The Name of the Wind"
  isbns:
    es: "978-84-95..."
    en: "978-0-75..."
  langs: ["es", "en"]
  isbn: "978-84-95..."           ← fallback legacy, se mantiene como campo auxiliar
```

El campo `title` plano ya no se escribe. Documentos legacy que lo tengan siguen siendo
leídos como último fallback.

**`saveBooksToDB(books, lang)`**
- `batch.set` ya NO incluye `title: book.title`.
- Primera pasada: `updateBookTitleToDB(key, title, lang, isbn)` para el idioma actual.
- Background fire-and-forget: `fetchWorkEditionByLang(key, otherLang)` → `updateBookTitleToDB(key, otherTitle, otherLang, otherIsbn)`.

**`updateBookTitleToDB(workKey, title, lang, isbn?)`**
- `updateDoc` con `{ titles.{lang}: title, langs: arrayUnion(lang) }` + opcionalmente `isbns.{lang}: isbn`.
- El `arrayUnion(lang)` asegura que el libro sea descubrible en `getExploreBooksFromDB` para ambos idiomas.

**`getExploreBooksFromDB(lang, minCount)` y `getAuthorBooksFromDB(authorKey, excludeTitle, lang)`**
- Resolución de título: `titles[lang] → titles.es → titles.en → title(legacy) → ""`.
- Resolución de isbn: `isbns[lang] → isbns.es → isbns.en → isbn(legacy) → undefined`.

**`fetchWorkEditionByLang(workKey, lang)`** — en `openLibraryApi.ts`:
- Llama a `${workKey}/editions.json` con `limit: 20`.
- Busca edición con `languages[].key === /languages/${getLangIso3Letters(lang)}`.
- Devuelve `{ title, isbn }` o `null`.

**`enrichTitles(books, lang)`** — en `useExploreBooks.ts`:
- Se ejecuta en background tras cargar libros de Firestore para **cualquier idioma** (ya no hay early return para español).
- `Promise.all` sobre los libros sin `titles[lang]` → `fetchWorkEditionByLang` + `updateBookTitleToDB`.

---

### Sinopsis (`firebaseBooks.ts`, `useBookDetail.ts`, `googleBooksApi.ts`)

**Esquema Firestore:**
```
Books/OL123W:
  synopsis:
    es: "Una novela épica de fantasía..."
    en: "An epic fantasy novel..."
```

**`getSynopsisFromDB(workKey, lang)`**
- Si `synopsis` es string plano (legacy): migra en background a `{ es: synopsis }` vía `setDoc + merge`,
  y devuelve `null` para idiomas distintos al español (fuerza un fetch fresco).
- Si es objeto: devuelve `synopsis[lang] ?? synopsis['es'] ?? synopsis['en'] ?? null`.

**`saveSynopsisToDB(workKey, synopsis, lang)`**
- Intenta `updateDoc` con dot-notation (caso normal: doc existe vía `saveBooksToDB`).
- Si el doc no existe (acceso directo por URL sin libro cacheado), el `catch` crea el doc
  con `setDoc(ref, { synopsis: { [lang]: synopsis } }, { merge: true })`.

**`useBookDetail`** — flujo proactivo:
1. Lee sinopsis de Firestore para `lang` actual.
2. Si hay → usarla para display.
3. Si no hay → fetchear Google Books para `lang`, mostrar y guardar.
4. **Background** (fire-and-forget): comprobar si el otro idioma tiene sinopsis en Firestore. Si no → fetchear y guardar.

**`fetchGoogleSynopsis(title, signal, isbn?, author?, lang?)`**
- Parámetro `lang` (default `'es'`). Intento 2 usa `langRestrict: lang`.

---

### Bio de autor (`firebaseAuthors.ts`, `useAuthorData.ts`, `openLibraryApi.ts`)

**Esquema Firestore:**
```
Authors/OL23919A:
  bio:
    es: "Patrick Rothfuss es un escritor..."
    en: "Patrick Rothfuss is an American writer..."
  photoUrl: "https://..."
```

**`AuthorData.bio`**: `Record<string, string>` (no string plano).

**`resolveBio(bio, lang)`**: `bio[lang] ?? bio['es'] ?? bio['en'] ?? ''`.

**`saveAuthorToDB`**: Dos pasos para evitar race condition (setDoc merge + updateDoc dot-notation).

**`useAuthorData`**: Si falta `bio[lang]` → fetch Wikipedia en background → `updateAuthorBioToDB`.

**Enrich de libros de autor (`useAuthorData`)**: Ya no tiene guard `lang !== 'es'`. El enrich
se ejecuta para **ambos idiomas** si hay libros sin `titles[lang]`.

---

### Foto de autor (`AuthorSection.tsx`)

**Bug:** `useState(!authorInfo.photoUrl)` inicializaba `photoError = true` porque `photoUrl`
estaba vacío en el primer render.

**Fix:** `useState(false)`.

---

### localStorage por idioma (`useExploreBooks.ts`)

Clave `LOCAL_STORAGE_KEY(lang)` → `trama_cache_${lang}`.

`loadFromStorage(lang)` y `saveToStorage(books, lang)` reciben `lang` como parámetro.
TTL de 24 horas.

---

### Títulos en la Shelf (`firebaseLibrary.ts`, `ShelfContext.tsx`, `useProfile.ts`)

**Esquema Firestore (Shelf doc):**
```
Users/{uid}/Shelf/OL123W:
  titles:
    es: "El Nombre del Viento"
    en: "The Name of the Wind"
  isbns:
    es: "978-84-95..."
    en: "978-0-75..."
```

**`addToShelf`** — escritura segura en dos pasos:
- Paso 1: `setDoc` con `merge: true` para los campos planos del libro (excluye `titles` e `isbns`
  del spread para no reemplazar el mapa entero y perder otros idiomas).
- Paso 2: `updateDoc` con dot-notation (`titles.${lang}`, `isbns.${lang}`) para escribir cada
  idioma individualmente sin pisar los demás.

Esto evita un bug donde `setDoc({...book}, {merge:true})` con un book que solo tenía un idioma
en `titles` reemplazaba el mapa entero, borrando títulos enriquecidos del otro idioma.

**`getShelf(uid)`** — resuelve título sin recibir `lang`:
`titles.es → titles.en → title(legacy) → ""`. ShelfContext sobreescribe con `titles[lang]` después.

**`ShelfContext.tsx`:**
- **Resolución en `shelfByStatus` y `getEntry`:** `book.titles?.[lang] ?? book.title`.
- **Enrich en background:** Ya no tiene guard `lang === 'es'`. Se ejecuta para cualquier idioma
  si hay libros sin `titles[lang]`.

**`useProfile.ts` — `entriesToShelf`:**
- Resolución con fallback completo: `titles[lang] → titles.es → titles.en → title(legacy) → ""`.

---

## Convenciones clave aprendidas

| Situación | Usar |
|---|---|
| Doc nuevo, objeto anidado | `setDoc(ref, { field: { [lang]: value } })` sin merge |
| Doc existente, campo anidado | `updateDoc(ref, { [\`field.${lang}\`]: value })` |
| Doc existente o nuevo, merge top-level | `setDoc(ref, { field: value }, { merge: true })` |
| Doc incierto, campo anidado | try `updateDoc` → catch `setDoc` con objeto anidado real |
| **NO usar** | `setDoc(ref, { [\`field.${lang}\`]: value }, { merge: true })` — crea campo literal |
| **NO usar** | `setDoc(ref, { field: { [lang]: v } }, { merge: true })` en doc existente — reemplaza `field` entero |

---

## Archivos modificados

| Archivo | Cambios |
|---|---|
| `src/services/api/googleBooksApi.ts` | Parámetro `lang` en `fetchGoogleSynopsis` |
| `src/services/api/openLibraryApi.ts` | Parámetro `lang` en `getWikipediaSummary`; nueva `fetchWorkEditionByLang` |
| `src/services/firebase/firebaseBooks.ts` | `saveBooksToDB` sin `title` plano, background fetch del otro idioma; `updateBookTitleToDB` con `arrayUnion(lang)`; fallback chains en lecturas; `saveSynopsisToDB` con try/catch |
| `src/services/firebase/firebaseAuthors.ts` | `bio` como `Record<string,string>`; `updateAuthorBioToDB`; `resolveBio`; `saveAuthorToDB` con dos pasos |
| `src/hooks/useBookDetail.ts` | Sinopsis bilingüe proactiva (background fetch del otro idioma) |
| `src/hooks/useAuthorData.ts` | Enrich sin guard `lang !== 'es'` |
| `src/hooks/useExploreBooks.ts` | `LOCAL_STORAGE_KEY` por idioma; `enrichTitles` sin early return para `es` |
| `src/components/book/info/AuthorSection.tsx` | Fix `useState(false)` para `photoError` |
| `src/types/Book.ts` | Añadidos `titles?` e `isbns?` |
| `src/types/OpenLibrary.ts` | Añadidos `WorkEditionEntry` y `WorkEditionsResponse` |
| `src/services/firebase/firebaseLibrary.ts` | `getShelf` con fallback `titles.es → titles.en → title`; `updateShelfBookTitleToDB` |
| `src/context/ShelfContext.tsx` | Enrich sin guard `lang === 'es'`; resolución de títulos por `lang` |
| `src/hooks/useProfile.ts` | `entriesToShelf` con fallback chain completo |
