# Libros favoritos — búsqueda en BBDD y privacidad

**Date:** 2026-05-15  
**Branch:** Develop  
**Related specs:** [2026-05-13-profile-firebase-integration-design.md](./2026-05-13-profile-firebase-integration-design.md)

---

## Objetivos de producto

1. **Búsqueda en el modal** contra la colección Firestore `Books` (no Open Library como fuente principal).
2. **Comportamiento “cualquier palabra”** del título: si el usuario escribe una palabra que aparece en el título (en el idioma actual), el libro puede salir (semántica **OR** si escribe varias palabras).
3. **Idioma:** usar `i18n.language` (`es` | `en`) para leer `titles.{lang}` y buscar en `titleTokens.{lang}`.
4. **Cobertura:** mensaje claro cuando no hay resultados en catálogo.
5. **Fallback opcional (prioridad 3):** si la búsqueda en BBDD devuelve **2 resultados o menos**, completar con Open Library; los libros de la API deben ser **distintos** de los ya devueltos por BBDD (dedupe por `key`), **persistirse solo si no existen** en `Books`, y reutilizar **`saveBooksToDB`** (incluye título en idioma alternativo vía `fetchWorkEditionByLang`, igual que Explorar / `useBookSearch`).
6. **Persistencia:** los favoritos se guardan en la subcolección `Users/{uid}/favorites/list` (documento único `{ books: FavoriteBook[] }`; cada favorito es un snapshot `key`, `title`, `authors`, `cover_url`). Ver Batch 3.5.
7. **Privacidad:** los favoritos se protegen **a nivel de dato** con la misma regla que estantería y actividad (`canViewProfileBody` en servidor / `canViewFull` en cliente): perfil público → favoritos visibles para cualquiera; perfil privado → solo el dueño y sus seguidores, tanto en la UI como en un acceso directo a Firestore. Se consigue moviendo los favoritos del documento público a una subcolección gateada (Batch 3.5).
8. **Fuera de alcance ahora (prioridad 4 futura):** prefijos intra-palabra (`pot` → *Potter*).

---

## Modelo de datos (`Books/{bookId}`)

Campos relevantes (existentes + nuevos):

```ts
titles: { es?: string; en?: string; ... }
titleTokens: { es?: string[]; en?: string[] }  // NUEVO
langs: string[]                               // ya existe
// resto: key, authors, cover_url, ...
```

**Reglas de tokens:**

- Normalizar: minúsculas, sin acentos (`NFD`), trim.
- Partir por espacios; descartar vacíos; longitud mínima 2 (configurable).
- Opcional: quitar stopwords (`el`, `la`, `de`, `the`, `a`, …).
- `dedupe` por documento e idioma.

**No usar** `titleSearch` plano como estrategia principal (no cumple “cualquier palabra”). Se puede omitir o no implementar.

---

## Plan por batches

| # | Batch | Contenido | Verificación |
|---|-------|-----------|--------------|
| 1 | Catálogo buscable | `titleTokens` + escritura + `searchBooksFromDB` + backfill | Query manual; backfill dry-run |
| 2 | Modal | Firestore + i18n + empty state | Buscar palabra del medio del título |
| 3 | Perfil y privacidad (UI) | i18n de `FavoriteBooksSection` + render bajo `canViewFull` | Privado sin follow no ve la sección |
| 3.5 | Favoritos privados (dato) | Mover favoritos a subcolección `favorites/list` gateada + regla + servicio + hook | `getDoc` directo a favoritos de perfil privado ajeno → denegado |
| 4 | Fallback OL (opcional) | Open Library → `saveBooksToDB` → reintento | Libro no cacheado aparece tras búsqueda |
| — | Futuro | Prefijos intra-palabra (prioridad 4) | — |

---

## Batch 1 — Catálogo buscable (`titleTokens`)

### 1.1 `src/utils/titleSearch.ts`

Crear o ampliar con exports:

- `normalizeTitleForSearch(title: string): string`
- `buildTitleTokens(title: string, options?: { minLength?: number; stopWords?: Set<string> }): string[]`
- `buildTitleTokensMap(titles: Record<string, string>, legacyTitle?: string, langs?: string[]): Record<string, string[]>`
- `isTitleTokensUpToDate(current: Record<string, string[]> | undefined, expected: Record<string, string[]>): boolean`

Ejemplo `normalizeTitleForSearch`:

```ts
export function normalizeTitleForSearch(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
```

Ejemplo `buildTitleTokens`:

```ts
export function buildTitleTokens(
  title: string,
  options?: { minLength?: number; stopWords?: Set<string> }
): string[] {
  const minLength = options?.minLength ?? 2;
  const stopWords = options?.stopWords;
  const words = normalizeTitleForSearch(title).split(/\s+/).filter(Boolean);
  const tokens: string[] = [];
  for (const word of words) {
    if (word.length < minLength) continue;
    if (stopWords?.has(word)) continue;
    tokens.push(word);
  }
  return [...new Set(tokens)];
}
```

### 1.2 `src/services/firebase/firebaseBooks.ts`

**Import:**

```ts
import {
  buildTitleTokens,
  normalizeTitleForSearch,
} from "@/utils/titleSearch";
```

**`updateBookTitleToDB`:** además de `titles.{lang}`:

```ts
[`titleTokens.${lang}`]: buildTitleTokens(title),
```

**`saveBooksToDB`:** sin cambio estructural; sigue llamando `updateBookTitleToDB` por libro (ahí se generan tokens).

**`searchBooksFromDB`:**

```ts
export async function searchBooksFromDB(
  queryText: string,
  lang: string,
  maxResults = 8
): Promise<Book[]> {
  const words = normalizeTitleForSearch(queryText)
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return [];

  const collectionRef = collection(db, BOOKS_COLLECTION);
  const tokenField = `titleTokens.${lang}`;
  const constraints =
    words.length === 1
      ? [
          where(tokenField, "array-contains", words[0]),
          limit(maxResults),
        ]
      : [
          where(tokenField, "array-contains-any", words.slice(0, 10)),
          limit(maxResults),
        ];

  const snap = await getDocs(query(collectionRef, ...constraints));
  return snap.docs.map((d) => mapBookDoc(d.data(), lang));
}
```

> **Una sola cláusula de array.** Firestore prohíbe usar más de un `array-contains` / `array-contains-any` por query. Por eso **no** se filtra por `langs` — sería una segunda cláusula de array e invalidaría la query. Y no hace falta: el idioma ya está en el *field path*. `titleTokens.es` solo contiene tokens de títulos en español y `titleTokens.en` solo en inglés, así que buscar `titleTokens.${lang}` ya restringe el resultado al idioma actual. El soporte multiidioma queda intacto: un libro con título en `es` y `en` es encontrable de forma independiente en cada idioma.

> **Nombre del parámetro:** el tercero se llama `maxResults`, no `limit`, para no sombrear la función `limit` importada de `firebase/firestore`.

### 1.3 Índices Firestore

**No se necesitan índices compuestos.** Las queries de `searchBooksFromDB` usan una única cláusula `array-contains` / `array-contains-any` sobre un solo campo (`titleTokens.{lang}`). Firestore resuelve ese tipo de query con el **índice automático de campo único** que mantiene por defecto para todos los campos — incluidos los arrays anidados dentro de un mapa. No hay que crear `firestore.indexes.json` ni añadir nada a `firebase.json`.

> Un índice compuesto con dos campos de array (p. ej. `langs` + `titleTokens.es`) sería además **rechazado** por Firestore en el deploy: un índice no puede contener más de un campo de array. Es la misma razón por la que la query de 1.2 se quedó con una sola cláusula de array.

### 1.4 Backfill `scripts/backfill-title-tokens.mjs`

Script Admin idempotente:

1. Paginar `Books` con `orderBy(__name__)`, `PAGE_SIZE` 400.
2. Por documento: `expected = buildTitleTokensMap(data.titles, data.title, data.langs)`.
3. Si `expected` vacío → skip.
4. Si `isTitleTokensUpToDate(data.titleTokens, expected)` → skip.
5. `batch.update({ titleTokens: expected })`.
6. Flags: `--dry-run` (solo contadores) / ejecución real.

> **Importar el tokenizer en el script:** `backfill-title-tokens.mjs` necesita `buildTitleTokensMap` de `src/utils/titleSearch.ts`, pero un `.mjs` lanzado con `node` no puede importar TypeScript directamente. Opciones: (a) ejecutarlo con `tsx` (`npx tsx scripts/backfill-title-tokens.mjs`), que permite importar el `.ts` tal cual; (b) duplicar el tokenizer en JS plano dentro del script. La opción (a) evita duplicar lógica y es la recomendada.

Ejecutar desde `functions/` (donde está `firebase-admin`):

```bash
# PowerShell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\service-account.json"
node ../scripts/backfill-title-tokens.mjs --dry-run
node ../scripts/backfill-title-tokens.mjs
```

### 1.5 Verificación Batch 1

- [ ] Documento en consola con `titleTokens.es` coherente con `titles.es`
- [ ] `searchBooksFromDB("viento", "es", 8)` devuelve libros esperados
- [ ] Segunda pasada del backfill: casi todo `skipped`
- [ ] `npm run build` sin errores

---

## Batch 2 — Modal de edición

### 2.1 `src/components/profile/modals/FavoriteBooksEditorModal.tsx`

| Antes | Después |
|-------|---------|
| `searchBooks` (Open Library) | `searchBooksFromDB` |
| `lang` fijo `"es"` | `i18n.language.split("-")[0]` |
| Sin empty state | UI si `!searching && query.trim() && results.length === 0` |

**`useEffect` de búsqueda (debounce 400 ms):**

```ts
const { i18n, t } = useTranslation();
const lang = i18n.language.split("-")[0];

// dentro del setTimeout:
const books = await searchBooksFromDB(query, lang, 8);
setResults(books);
```

- Dependencias del effect: `[query, lang]`
- Eliminar `AbortController` si ya no hay peticiones HTTP (opcional: cancelar solo el timer)
- `addFavorite`: sin cambios de forma (`key`, `title`, `authors`, `cover_url`)
- `handleSave`: `updateUserProfile(userId, { favoriteBooks: favorites })` + `onSave` + `onClose`

### 2.2 i18n

En `src/plugins/i18n/locales/es/profile.json` y `en/profile.json`, dentro de `"profile"`:

```json
"favorites": {
  "modalTitle": "Editar libros favoritos",
  "hint": "{{count}}/{{max}} libros seleccionados",
  "searchPlaceholder": "Buscar libro...",
  "searching": "Buscando...",
  "noResults": "No hay libros en el catálogo con esa búsqueda. Prueba otra palabra o búscalos antes en Explorar.",
  "save": "Guardar",
  "saving": "Guardando...",
  "saveError": "No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.",
  "closeAria": "Cerrar",
  "sectionTitle": "Libros favoritos",
  "edit": "Editar",
  "emptyOwn": "Añade hasta 5 libros favoritos pulsando \"Editar\"",
  "emptyOther": "Sin libros favoritos aún"
}
```

Traducir equivalentes en `en/profile.json`.

### 2.3 Verificación Batch 2

- [ ] Palabra del **medio** del título encuentra el libro (doc existente en `Books`)
- [ ] Cambiar idioma de la app afecta búsqueda y títulos mostrados
- [ ] 0 resultados muestra `noResults`
- [ ] Guardar persiste en Firestore y actualiza la sección del perfil

---

## Batch 3 — Perfil y privacidad

### 3.1 `src/pages/profile/ProfilePage.tsx`

- `FavoriteBooksSection` permanece **dentro** del bloque `canViewFull` (ya implementado en `ProfilePage`).
- Flujo `localFavorites` + modal sin cambios de arquitectura.

### 3.2 `src/hooks/useProfile.ts`

No hace falta ningún filtrado en cliente ni truco de UI para los favoritos: la privacidad se resuelve **a nivel de dato** en el Batch 3.5, moviendo los favoritos a una subcolección gateada. Tras ese batch, `useProfile` solo trae los favoritos en la fase 2 (cuando `canViewFull` es `true`); para un no-seguidor de un perfil privado ni siquiera se piden, y la regla los denegaría aunque se intentara. Ver Batch 3.5.

### 3.3 `src/components/profile/sections/FavoriteBooksSection.tsx`

Sustituir textos hardcodeados por `t("profile.favorites....")`.

### 3.4 Regla de visibilidad (referencia)

| Visitante | Perfil público | Perfil privado |
|-----------|----------------|----------------|
| Dueño | Ve y edita | Ve y edita |
| Ajeno, sigue | Ve | Ve |
| Ajeno, no sigue | Ve | **No** ve sección |

`canViewFull = isOwnProfile || (profile?.isPublic !== false) || isFollowingState`

### 3.5 Verificación Batch 3

- [ ] Perfil público: favoritos visibles
- [ ] Perfil privado sin follow: no se renderiza la sección de favoritos
- [ ] Perfil privado con follow: favoritos visibles tras follow
- [ ] Propio perfil: siempre puede editar

> La verificación de privacidad **a nivel de dato** (acceso directo denegado) está en el Batch 3.5.

---

## Batch 3.5 — Favoritos como subcolección privada

Hasta ahora `favoriteBooks` es un campo del documento público `Users/{uid}` (`allow read: if true`), así que su privacidad era solo a nivel de UI. Este batch lo convierte en privacidad **a nivel de dato**: los favoritos pasan a una subcolección gateada con la misma regla que `Shelf` y `activity`.

### 3.5.1 Modelo de datos

`favoriteBooks` **sale** de `Users/{uid}`. Nueva ubicación:

```
Users/{uid}/favorites/list      // subcolección `favorites`, documento único de id `list`
  books: FavoriteBook[]         // cada item: { key, title, authors, cover_url }
```

Se usa **un array en un solo documento** (no un doc por libro) porque los favoritos son una lista ordenada y acotada (máx. 5): el orden se preserva solo y guardar/leer es una única operación. Mismo patrón que `Users/{uid}/private/info`.

### 3.5.2 Regla Firestore

Dentro de `match /Users/{uid}`, añadir:

```
match /favorites/{doc} {
  allow read:  if canViewProfileBody(uid);
  allow write: if isOwner(uid);
}
```

Mismo tier que `Shelf` y `activity`: lee el dueño, o cualquiera si el perfil es público, o un seguidor si es privado. Hay que añadir esta regla en la consola de Firebase (y en `firestore.rules` si se versiona).

### 3.5.3 Servicio — `firebaseUsers.ts`

```ts
export async function getFavorites(uid: string): Promise<FavoriteBook[]> {
  const snap = await getDoc(doc(db, "Users", uid, "favorites", "list"));
  if (!snap.exists()) return [];
  return (snap.data().books as FavoriteBook[]) ?? [];
}

export async function setFavorites(
  uid: string,
  books: FavoriteBook[]
): Promise<void> {
  await setDoc(doc(db, "Users", uid, "favorites", "list"), { books });
}
```

`createUserProfile`: **eliminar** `favoriteBooks: []` del payload sembrado en `Users/{uid}`. El doc de favoritos no existe hasta que el usuario añade el primero; `getFavorites` devuelve `[]` en ese caso.

### 3.5.4 Tipos — `UserProfile.ts`

Quitar `favoriteBooks` de `UserFullProfile` (ya no está en el doc público). `FavoriteBook` se mantiene igual. `getUserProfile` deja de leer y devolver `favoriteBooks`.

### 3.5.5 Hook — `useProfile.ts`

Los favoritos pasan a cargarse en la **fase 2** (la gateada), junto a `shelf` y `activity`, porque ahora los protege la misma regla `canViewProfileBody` ↔ `canViewFull`:

- Añadir estado `favorites: FavoriteBook[]`.
- En el `load()` de la fase 2, sumar `getFavorites(userId)` al `Promise.all`.
- Exponer `favorites` en el return del hook.
- Para un perfil privado sin follow, la fase 2 no corre → `favorites` queda `[]`, y la regla denegaría la lectura aunque se intentara.

### 3.5.6 `FavoriteBooksEditorModal.tsx`

`handleSave`: sustituir `updateUserProfile(userId, { favoriteBooks: favorites })` por `setFavorites(userId, favorites)`.

### 3.5.7 `ProfilePage.tsx`

`localFavorites` se sincroniza desde `useProfile().favorites` en vez de `profile.favoriteBooks`. El patrón `prevProfile` que reseteaba `localFavorites` pasa a observar el nuevo `favorites`.

### 3.5.8 Migración

Ninguna: las cuentas se borran y recrean (igual que con `email`/`birthDate` en el spec de integración). Los usuarios nuevos nacen con el modelo correcto.

### 3.5.9 Verificación Batch 3.5

- [ ] Guardar favoritos crea/actualiza `Users/{uid}/favorites/list`; `Users/{uid}` ya no tiene campo `favoriteBooks`
- [ ] Perfil propio y perfil público ajeno: favoritos visibles
- [ ] Perfil privado, **no** seguidor: `getDoc(Users/{uid}/favorites/list)` desde la consola del navegador → **denegado** (privacidad a nivel de dato)
- [ ] Perfil privado, seguidor: favoritos visibles tras seguir
- [ ] `npm run build` sin errores

---

## Batch 4 — Fallback Open Library (opcional)

### Comportamiento esperado (requisitos)

1. **Siempre consultar BBDD primero** con `searchBooksFromDB`.
2. **Activar fallback API** cuando la BBDD devuelva **2 resultados o menos** (`fromDb.length <= 2`). Si devuelve 3 o más, se considera cubierta y no se consulta Open Library.
3. **Dedupe:** los libros que vengan de la API deben tener `key` **distinto** de cualquier libro ya obtenido de BBDD (`fromDb`). No duplicar obras en la lista del modal.
4. **Persistencia:** llamar `saveBooksToDB` con los libros de la API que se van a mostrar. `saveBooksToDB` usa `set` con `{ merge: true }`, así que es seguro tanto para libros nuevos (los crea) como para los que ya existan (los fusiona sin destruir nada). Re-guardar uno existente además **regenera sus `titleTokens`**, lo que arregla libros cacheados con tokens obsoletos. **No** se filtra por existencia previa: esa comprobación costaría una lectura por libro y dejaría sin re-tokenizar justo los libros que más lo necesitan.
5. **Idioma alternativo:** no reimplementar en el helper; **`saveBooksToDB(books, lang)`** ya:
   - escribe título + `titleTokens` del idioma actual vía `updateBookTitleToDB`;
   - en segundo plano llama `fetchWorkEditionByLang(book.key, otherLang)` y `updateBookTitleToDB` para `es` ↔ `en` (mismo flujo que Explorar).
6. **Respuesta al modal:** combinar `fromDb` + libros API únicos, recortar a `maxResults`. Opcionalmente, tras `saveBooksToDB`, volver a llamar `searchBooksFromDB` solo para los docs recién guardados si se prefiere forma canónica desde Firestore; en v1 es aceptable devolver los `Book` de la API ya mapeados al idioma actual si la lista final está deduplicada.

### 4.1 Helper en `firebaseBooks.ts`

```ts
import { searchBooks } from "@/services/api/openLibraryApi";

export async function searchBooksWithFallback(
  queryText: string,
  lang: string,
  maxResults = 8,
  signal?: AbortSignal
): Promise<Book[]> {
  const fromDb = await searchBooksFromDB(queryText, lang, maxResults);

  // 3 o más resultados en BBDD → se considera cubierta, no se consulta la API
  if (fromDb.length > 2) return fromDb;

  // BBDD con 2 o menos → ampliar con Open Library
  const dbKeys = new Set(fromDb.map((b) => b.key));
  const remaining = maxResults - fromDb.length;
  const effectiveSignal = signal ?? new AbortController().signal;

  const { books: fromApi } = await searchBooks(
    { q: queryText },
    remaining + dbKeys.size, // pedir de más por si hay solapamiento con BBDD
    lang,
    effectiveSignal
  );

  const apiUnique = fromApi.filter((b) => !dbKeys.has(b.key));
  const toShow = apiUnique.slice(0, remaining);
  if (toShow.length === 0) return fromDb;

  // Persistir en Books: merge sobre existentes, crea los nuevos.
  // Re-guardar regenera titleTokens, así que también arregla libros
  // que estaban en BBDD pero con tokens obsoletos.
  await saveBooksToDB(toShow, lang).catch(() => {});

  // Lista final: BBDD + API deduplicada (títulos ya en `lang` desde OL)
  return [...fromDb, ...toShow].slice(0, maxResults);
}
```

### 4.2 Modal

- Usar `searchBooksWithFallback` en lugar de solo `searchBooksFromDB`.
- Mantener `noResults` si la lista combinada sigue vacía tras el fallback.
- Indicador UX opcional: “Buscando en catálogo…” vs “Ampliando búsqueda…” (i18n).

### 4.3 Verificación Batch 4

- [ ] Libro solo en Open Library: aparece en modal, doc creado en `Books`, `titleTokens.{lang}` y `titles.{otherLang}` poblados tras `saveBooksToDB`
- [ ] Libro ya en BBDD: no se duplica en la lista
- [ ] Misma búsqueda repetida: segunda vez resuelve principalmente con `searchBooksFromDB`
- [ ] Cambio de idioma de la app: título alternativo disponible en `titles.en` / `titles.es` en consola

---

## Futuro — Prioridad 4 (no implementar ahora)

Prefijos por palabra (≥3 caracteres) en `titlePrefixes.{lang}` para coincidencias tipo `pot` → *Potter*.

Evaluar solo si en uso real fallan búsquedas con una sola palabra completa. Alternativas: mantener Batch 4 (fallback OL) o valorar Firestore Enterprise Pipeline (`LIKE` / `string_contains`).

---

## Comportamiento de búsqueda (referencia)

| Entrada usuario | Query Firestore | Semántica |
|-----------------|-----------------|-----------|
| `viento` | `array-contains` `viento` | Una palabra |
| `nombre viento` | `array-contains-any` `["nombre","viento"]` | OR: cualquier palabra |
| Ambas palabras obligatorias (AND) | No nativo en una sola query | Filtrar en cliente sobre pocos resultados si se requiere después |

---

## Archivos tocados (resumen)

| Archivo | Batch |
|---------|-------|
| `src/utils/titleSearch.ts` | 1 |
| `src/services/firebase/firebaseBooks.ts` | 1, 4 |
| `scripts/backfill-title-tokens.mjs` | 1 |
| `src/components/profile/modals/FavoriteBooksEditorModal.tsx` | 2, 3.5, 4 |
| `src/plugins/i18n/locales/es/profile.json` | 2, 3 |
| `src/plugins/i18n/locales/en/profile.json` | 2, 3 |
| `src/components/profile/sections/FavoriteBooksSection.tsx` | 3 |
| `src/pages/profile/ProfilePage.tsx` | 3, 3.5 |
| `src/hooks/useProfile.ts` | 3, 3.5 |
| `src/services/firebase/firebaseUsers.ts` | 3.5 |
| `src/types/UserProfile.ts` | 3.5 |
| Reglas Firestore (consola / `firestore.rules`) | 3.5 |

---

## Fuera de alcance de este spec

- Reglas Firestore versionadas (archivos `firestore.rules` / `storage.rules` en el repo)
- Firestore Enterprise Pipeline (`LIKE`)
- Algolia u otro motor de búsqueda dedicado
- Suite de tests automatizados (opcional: unit tests de `buildTitleTokens`)
