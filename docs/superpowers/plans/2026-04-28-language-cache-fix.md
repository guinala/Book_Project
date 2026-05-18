# Pendiente: Fix caché multi-idioma

Todos los problemas detectados donde el idioma del usuario no se respeta correctamente,
ordenados de mayor a menor impacto.

---

## PROBLEMA 1 — Sinopsis hardcoded en español
**Gravedad: Alta**
**Archivos:** `src/services/api/googleBooksApi.ts`, `src/hooks/useBookDetail.ts`

`fetchGoogleSynopsis` tiene el intento 2 fijado a `langRestrict: 'es'` y la función
no recibe `lang` como parámetro. Un usuario en inglés siempre obtiene la sinopsis
buscada en español primero.

```ts
// googleBooksApi.ts — intento 2 hardcoded:
langRestrict: 'es',   // ← siempre español

// Solución: pasar lang como parámetro
export async function fetchGoogleSynopsis(
  title: string,
  signal: AbortSignal,
  isbn?: string,
  author?: string,
  lang = 'es',        // ← añadir parámetro
): Promise<string>

// Intento 2 pasa a usar el idioma del usuario:
langRestrict: lang,
```

En `useBookDetail.ts`, pasar el idioma actual al llamar a `fetchGoogleSynopsis`:
```ts
// Antes:
fetchGoogleSynopsis(title, signal, isbn, author)

// Después:
const { i18n } = useTranslation();
fetchGoogleSynopsis(title, signal, isbn, author, i18n.language.substring(0, 2))
```

---

## PROBLEMA 2 — Sinopsis en Firestore sin separación por idioma
**Gravedad: Alta**
**Archivos:** `src/services/firebase/firebase_books.ts`, `src/hooks/useBookDetail.ts`

La sinopsis se guarda en un único campo `synopsis`. El primer usuario que visita
un libro determina el idioma de la sinopsis para todos los usuarios futuros.

```
// Esquema actual (problema):
books/OL123W:
  synopsis: "Una novela épica de fantasía..."   ← en el idioma del primer visitante

// Esquema propuesto:
books/OL123W:
  synopsis: {
    es: "Una novela épica de fantasía...",
    en: "An epic fantasy novel..."
  }
```

**`saveSynopsisToDB` — escribir por idioma:**
```ts
// Antes:
await setDoc(ref, { synopsis }, { merge: true });

// Después:
await setDoc(ref, { [`synopsis.${lang}`]: synopsis }, { merge: true });
```

**`getSynopsisFromDB` — leer por idioma:**
```ts
// Antes:
return document.data().synopsis ?? null;

// Después:
const data = document.data();
return data.synopsis?.[lang] ?? data.synopsis ?? null;
// El fallback a data.synopsis cubre documentos legacy con el campo plano
```

**`useBookDetail.ts` — pasar lang a ambas funciones:**
```ts
getSynopsisFromDB(decodedId, lang)
saveSynopsisToDB(decodedId, fetched, lang)
```

---

## PROBLEMA 3 — Libros del autor hardcoded en español
**Gravedad: Media**
**Archivo:** `src/hooks/useAuthorData.ts`

Cuando Firestore no tiene suficientes libros del autor, el fallback a la API
está hardcoded a español:

```ts
// Líneas 105-106 — hardcoded 'es':
const apiBooks = await fetchAuthorBooks(authorName, 'es', 10);
saveBooksToDB(apiBooks, 'es');
```

`useAuthorData` no recibe el idioma actual. Solución:

```ts
// Añadir lang como parámetro del hook:
export function useAuthorData(
  authorName: string,
  currentBookTitle = "",
  authorKey?: string,
  lang = 'es'         // ← añadir
)

// Usar en el fallback:
const apiBooks = await fetchAuthorBooks(authorName, lang, 10);
saveBooksToDB(apiBooks, lang);
```

En `BookDetailPage.tsx`, pasar el idioma al hook:
```ts
const { lang } = useCurrentLanguage();
const { authorInfo, loading: authorLoading } = useAuthorData(
  book?.author ?? '',
  book?.title ?? '',
  book?.authorKey,
  lang               // ← añadir
);
```

---

## PROBLEMA 4 — Bio del autor en Firestore sin idioma
**Gravedad: Media**
**Archivos:** `src/services/api/openLibraryApi.ts`, `src/services/firebase/firebase_authors.ts`

`getWikipediaSummary` siempre prueba español primero y guarda el resultado en
Firestore sin indicar el idioma. Un usuario en inglés lee la bio en español
si existe en Wikipedia.

```
// Esquema actual (problema):
Authors/OL23919A:
  bio: "Patrick Rothfuss es un escritor..."   ← siempre en el idioma del primer visitante

// Esquema propuesto:
Authors/OL23919A:
  bio: {
    es: "Patrick Rothfuss es un escritor...",
    en: "Patrick Rothfuss is an American writer..."
  }
```

**`getWikipediaSummary`** — actualmente siempre intenta `es` → `en`. Hacerlo
configurable según el idioma del usuario:
```ts
// Antes (openLibraryApi.ts):
return (await attempt('es')) ?? (await attempt('en'));

// Después — intentar en el idioma del usuario primero:
export async function getWikipediaSummary(name: string, lang = 'es'): Promise<WikiSummary | null> {
  const fallback = lang === 'es' ? 'en' : 'es';
  return (await attempt(lang)) ?? (await attempt(fallback));
}
```

**`saveAuthorToDB`** — guardar bio por idioma:
```ts
// Antes:
{ key, name, bio, photoUrl, cachedAt }

// Después:
{ key, name, [`bio.${lang}`]: bio, photoUrl, cachedAt }
```

**`getAuthorFromDB`** — leer bio por idioma:
```ts
// Antes:
return { bio: data.bio, photoUrl: data.photoUrl };

// Después:
return {
  bio: data.bio?.[lang] ?? data.bio ?? '',
  photoUrl: data.photoUrl,
};
```

`photoUrl` es independiente del idioma — no cambia.

---

## PROBLEMA 5 — Título en BookDetailPage viene del estado de navegación
**Gravedad: Baja** (derivado del problema de caché de ExplorePage)
**Archivo:** `src/hooks/useBookDetail.ts`

El título mostrado en detalle viene de `location.state?.book`, que es el objeto
cacheado en localStorage/Firestore. Si ese objeto tenía el título en español
(porque fue cacheado por un usuario en español), el usuario en inglés ve
el título en español. Se resuelve al implementar el Fix 2 de Explore
(`titles.${lang}` en Firestore).

---

## PROBLEMA 6 — localStorage de Explore sin separación por idioma
**Gravedad: Alta**
**Archivo:** `src/hooks/useFantasyBooks_GoogleOpen.ts`

La clave `trama_cache` es única para todos los idiomas.

```ts
// Antes:
const LOCAL_STORAGE_KEY = 'trama_cache';

// Después (dentro de fetchBooks, donde lang está disponible):
const LOCAL_STORAGE_KEY = `trama_cache_${lang}`;
```

`loadFromStorage` y `saveToStorage` deben recibir `lang` como parámetro.

---

## PROBLEMA 7 — Títulos en Firestore sin separación por idioma
**Gravedad: Alta**
**Archivo:** `src/services/firebase/firebase_books.ts`

`saveBooksToDB` usa `{ merge: true }` con un único campo `title`, por lo que
el último usuario en escribir sobreescribe el título del anterior.

```
// Esquema propuesto:
books/OL123W:
  titles: {
    es: "El Nombre del Viento",
    en: "The Name of the Wind"
  }
  // Mantener title como fallback legacy
```

**`saveBooksToDB`:**
```ts
[`titles.${lang}`]: book.title,
// Eliminar: title: book.title
```

**`getExploreBooksFromDB` y `getAuthorBooksFromDB`:**
```ts
title: data.titles?.[lang] ?? data.title ?? "",
```

---

## Orden de implementación recomendado

| Prioridad | Problema | Impacto visible |
|---|---|---|
| 1 | Problema 6 — localStorage por idioma | Inmediato en Explore |
| 2 | Problema 7 — titles.{lang} en Firestore | Explore + libros del autor |
| 3 | Problema 1 — sinopsis hardcoded es | Detalle de libro |
| 4 | Problema 2 — synopsis.{lang} en Firestore | Detalle de libro |
| 5 | Problema 3 — libros autor hardcoded es | Sección autor |
| 6 | Problema 4 — bio autor por idioma | Sección autor |
| 7 | Problema 5 — título desde estado nav | Se resuelve con P7 |

## Archivos a modificar (resumen)

| Archivo | Cambios |
|---|---|
| `src/hooks/useFantasyBooks_GoogleOpen.ts` | Clave localStorage por idioma |
| `src/hooks/useBookDetail.ts` | Pasar lang a getSynopsisFromDB, saveSynopsisToDB, fetchGoogleSynopsis |
| `src/hooks/useAuthorData.ts` | Añadir parámetro lang; usarlo en fetchAuthorBooks y saveBooksToDB |
| `src/pages/BookDetailPage/BookDetailPage.tsx` | Pasar lang a useAuthorData |
| `src/services/api/googleBooksApi.ts` | Añadir parámetro lang a fetchGoogleSynopsis |
| `src/services/api/openLibraryApi.ts` | Añadir parámetro lang a getWikipediaSummary |
| `src/services/firebase/firebase_books.ts` | titles.{lang}, synopsis.{lang}, leer con fallback legacy |
| `src/services/firebase/firebase_authors.ts` | bio.{lang}, leer con fallback legacy |
