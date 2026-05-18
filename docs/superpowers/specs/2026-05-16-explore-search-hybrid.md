# Búsqueda híbrida en Explorar — `useBookSearch`

**Date:** 2026-05-16
**Branch:** Develop
**Related specs:** [2026-05-15-favorite-books-search.md](./2026-05-15-favorite-books-search.md)

---

## Overview

La barra de búsqueda de Explorar (`useBookSearch`) hoy consulta **solo OpenLibrary**. Se quiere aplicar la misma lógica híbrida del modal de favoritos: buscar primero en la colección Firestore `Books`, y solo si el catálogo local no cubre la búsqueda, ampliar con OpenLibrary.

Diferencia clave respecto al modal de favoritos: Explorar tiene un **`SearchFilter`** (`"todo" | "titulo" | "autor" | "isbn"`), y `searchBooksFromDB` solo sabe buscar por tokens de título. Hay que cubrir los cuatro filtros, lo que obliga a construir infraestructura nueva para la búsqueda por autor.

### Objetivos

1. **DB-first**: cada búsqueda consulta `Books` primero.
2. **Fallback a OpenLibrary** cuando la BBDD devuelve **6 resultados o menos** (`fromDb.length <= 6`). Con 7+ se considera cubierta y no se llama a la API. (Umbral más alto que el modal de favoritos —que era ≤2— porque Explorar es una página de búsqueda completa.)
3. **Cuatro filtros cubiertos en BBDD:**
   - `titulo` / `todo` → tokens de título (`searchBooksFromDB`, ya existe).
   - `autor` → tokens de autor (nuevo campo `authorTokens` + función nueva).
   - `isbn` → match exacto.
4. **Idioma**: usar el `lang` actual (`i18n.language`), no `"es"` fijo.
5. **Dedupe**: los resultados de OpenLibrary que se muestren deben ser distintos (`key`) de los ya obtenidos de BBDD.
6. **Persistencia**: los resultados de OpenLibrary se cachean en `Books` vía `saveBooksToDB` (que ya genera `titleTokens`; este spec añade que genere también `authorTokens`).
7. **`totalResults`**: deja de ser el total de OpenLibrary. Pasa a ser `books.length` — el número de resultados realmente mostrados.

### Decisiones tomadas

- Umbral de fallback: **≤ 6**.
- `authorTokens`: **array plano**, no mapa por idioma — un autor no se traduce ("Gabriel García Márquez" es igual en `es` y `en`).
- `totalResults` en DB-first: **`books.length`**.

---

## Modelo de datos (`Books/{bookId}`)

Campo nuevo:

```ts
authorTokens: string[]   // NUEVO — tokens normalizados de TODOS los nombres de autor del libro
```

Plano (no `{ es, en }`). Se genera tokenizando cada nombre de `authors` y aplanando. Mismas reglas de tokenización que `titleTokens` (minúsculas, sin acentos, `minLength` 2, stopwords) — se reutiliza `buildTitleTokens`.

Ejemplo: `authors: ["Brandon Sanderson"]` → `authorTokens: ["brandon", "sanderson"]`.

---

## Plan por batches

| # | Batch | Contenido | Verificación |
|---|-------|-----------|--------------|
| A | Infraestructura `authorTokens` | `buildAuthorTokens` + escritura en `saveBooksToDB` + backfill | Doc de `Books` con `authorTokens` coherente |
| B | Funciones de búsqueda en BBDD | `searchBooksByAuthorFromDB` + `searchBooksByIsbnFromDB` + dispatcher `searchBooksInDB` | Query manual por autor / ISBN |
| C | Híbrido en `useBookSearch` | DB-first + umbral ≤6 + fallback + dedupe + lang + `totalResults` | Buscar título/autor/isbn cacheado y no cacheado |

---

## Batch A — Infraestructura `authorTokens`

### A.1 `src/utils/titleSearch.ts`

Función nueva `buildAuthorTokens`: tokeniza una lista de nombres de autor en un único array plano y deduplicado.

```ts
export function buildAuthorTokens(authors: string[]): string[] {
  const tokens = new Set<string>();
  for (const name of authors ?? []) {
    for (const token of buildTitleTokens(name)) {
      tokens.add(token);
    }
  }
  return [...tokens];
}
```

Se apoya en `buildTitleTokens` porque un nombre de autor es texto: "Miguel de Cervantes" → `["miguel", "cervantes"]` ("de" cae como stopword, lo cual es correcto — nadie busca un autor por "de").

Helper de comparación para el backfill (simetría con `isTitleTokensUpToDate`):

```ts
export function isAuthorTokensUpToDate(
  current: string[] | undefined,
  expected: string[]
): boolean {
  if (!current) return expected.length === 0;
  if (current.length !== expected.length) return false;
  const set = new Set(current);
  return expected.every((t) => set.has(t));
}
```

### A.2 `src/services/firebase/firebaseBooks.ts`

**Import:**
```ts
import { buildTitleTokens, buildAuthorTokens } from "@/utils/titleSearch";
```

**`saveBooksToDB`** — añadir `authorTokens` al `batch.set`. A diferencia de `titleTokens` (que se escribe por idioma en `updateBookTitleToDB`), `authorTokens` es plano y va en el `set` principal:

```ts
batch.set(ref, {
  key: book.key,
  authors: book.authors,
  authorTokens: buildAuthorTokens(book.authors ?? []),   // ← NUEVO
  first_publish_year: book.first_publish_year,
  // ...resto de campos igual
  langs: arrayUnion(lang),
}, { merge: true });
```

### A.3 Backfill

Extender el script `backfill-title-tokens` existente para poblar también `authorTokens` en los libros ya cacheados:

- Importar `buildAuthorTokens` e `isAuthorTokensUpToDate`.
- Por documento: `expectedAuthorTokens = buildAuthorTokens(data.authors ?? [])`.
- Un doc necesita update si **`titleTokens` O `authorTokens`** están desactualizados.
- El `batch.update` escribe ambos: `{ titleTokens, authorTokens }`.

Como el script ahora hace dos cosas, conviene renombrarlo a `backfill-search-tokens` (opcional, cosmético).

### A.4 Verificación Batch A

- [ ] Tras un `saveBooksToDB` (p. ej. una búsqueda en Explorar), un doc nuevo de `Books` tiene `authorTokens` coherente con `authors`.
- [ ] Backfill ejecutado: los docs viejos tienen `authorTokens`.
- [ ] Segunda pasada del backfill: casi todo `saltados`.
- [ ] `npm run build` sin errores.

---

## Batch B — Funciones de búsqueda en BBDD por filtro

Todo en `src/services/firebase/firebaseBooks.ts`.

### B.1 `searchBooksByAuthorFromDB`

Espejo de `searchBooksFromDB`, pero sobre el campo plano `authorTokens` (sin `.${lang}`):

```ts
export async function searchBooksByAuthorFromDB(
  queryText: string,
  lang: string,
  maxResults = 20
): Promise<Book[]> {
  const words = buildTitleTokens(queryText);
  if (words.length === 0) return [];

  const collectionRef = collection(db, BOOKS_COLLECTION);
  const FETCH_LIMIT = 60; // traer de más para rankear en cliente

  const constraints =
    words.length === 1
      ? [where("authorTokens", "array-contains", words[0]), limit(FETCH_LIMIT)]
      : [where("authorTokens", "array-contains-any", words.slice(0, 10)), limit(FETCH_LIMIT)];

  const snap = await getDocs(query(collectionRef, ...constraints));

  const scored = snap.docs.map((d) => {
    const data = d.data();
    const tokens: string[] = data.authorTokens ?? [];
    let score = 0;
    for (const w of words) {
      if (tokens.includes(w)) score++;
    }
    return { book: mapBookDoc(data, lang), score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults).map((s) => s.book);
}
```

Mismo patrón que el `searchBooksFromDB` arreglado: `array-contains` / `array-contains-any`, traer de más (`FETCH_LIMIT`), rankear por nº de palabras del query que casan, recortar a `maxResults`.

### B.2 `searchBooksByIsbnFromDB`

El ISBN es match exacto por naturaleza — no necesita tokens ni scoring:

```ts
export async function searchBooksByIsbnFromDB(
  isbnQuery: string,
  lang: string,
  maxResults = 20
): Promise<Book[]> {
  const isbn = isbnQuery.replace(/-/g, "").trim();
  if (isbn.length === 0) return [];

  const snap = await getDocs(
    query(
      collection(db, BOOKS_COLLECTION),
      where("isbn", "==", isbn),
      limit(maxResults)
    )
  );
  return snap.docs.map((d) => mapBookDoc(d.data(), lang));
}
```

Se consulta el campo `isbn` (el de nivel raíz). Limitación conocida: un libro cacheado cuyo ISBN solo esté en `isbns.{lang}` y no en `isbn` no se encontraría en BBDD — pero entonces el fallback a OpenLibrary lo cubre. Aceptable.

### B.3 Dispatcher `searchBooksInDB`

Punto único de entrada que rutea según el filtro, para que `useBookSearch` no tenga el `switch`:

```ts
import type { SearchFilter } from "@/types/Search";

export async function searchBooksInDB(
  queryText: string,
  filter: SearchFilter,
  lang: string,
  maxResults = 20
): Promise<Book[]> {
  switch (filter) {
    case "autor":
      return searchBooksByAuthorFromDB(queryText, lang, maxResults);
    case "isbn":
      return searchBooksByIsbnFromDB(queryText, lang, maxResults);
    case "titulo":
    case "todo":
    default:
      return searchBooksFromDB(queryText, lang, maxResults);
  }
}
```

Nota sobre `todo`: en BBDD se trata como búsqueda por título (tokens de título). En la API, `getSearchParams` lo traduce a `q` (búsqueda general). Es una asimetría aceptable — la mayoría de búsquedas libres son por título.

### B.4 Verificación Batch B

- [ ] `searchBooksByAuthorFromDB("sanderson", "es", 20)` devuelve libros de Brandon Sanderson cacheados.
- [ ] `searchBooksByIsbnFromDB("9788466657734", "es")` devuelve el libro con ese ISBN si está cacheado.
- [ ] `searchBooksInDB(query, "autor", lang)` rutea correctamente.

---

## Batch C — Híbrido en `useBookSearch`

### C.1 Helper de dedupe

Extraer la lógica "mejor edición por título" que hoy está inline en `fetchBooks` a un helper a nivel de módulo:

```ts
function dedupBestByTitle(books: Book[]): Book[] {
  const isBetter = (a: Book, b: Book) =>
    (!!a.cover_id && !b.cover_id) ||
    (!!a.cover_id === !!b.cover_id && (a.ratingCount ?? 0) > (b.ratingCount ?? 0));

  const bestByTitle = new Map<string, Book>();
  for (const book of books) {
    const key = book.title.toLowerCase().trim();
    const existing = bestByTitle.get(key);
    if (!existing || isBetter(book, existing)) {
      bestByTitle.set(key, book);
    }
  }
  return [...bestByTitle.values()];
}
```

### C.2 Reescritura de `fetchBooks`

```ts
const fetchBooks = useCallback(async (
  query: string,
  filter: SearchFilter,
  limit: number = 20,
  lang: string = "es"
) => {
  abortController.current?.abort();
  const controller = new AbortController();
  abortController.current = controller;
  const { signal } = controller;

  try {
    setLoading(true);
    setError(null);

    const trimmed = query.trim();

    // 1. BBDD primero
    const fromDb = await searchBooksInDB(trimmed, filter, lang, limit);
    if (signal.aborted) return;

    // 2. 7+ en BBDD → cubierta, sin API
    if (fromDb.length > 6) {
      setBooks(fromDb);
      setTotalResults(fromDb.length);
      return;
    }

    // 3. ≤6 → ampliar con OpenLibrary
    const dbKeys = new Set(fromDb.map((b) => b.key));
    let apiUnique: Book[] = [];
    try {
      const params = getSearchParams(trimmed, filter);
      const result = await searchBooks(params, limit, lang, signal);
      const deduplicated = dedupBestByTitle(result.books);
      apiUnique = deduplicated.filter((b) => !dbKeys.has(b.key));
    } catch (err) {
      if (axios.isCancel(err)) return;
      // OL puede fallar (422 por query corta, rate limit...) → degradar a lo de BBDD
      apiUnique = [];
    }
    if (signal.aborted) return;

    const merged = [...fromDb, ...apiUnique];
    setBooks(merged);
    setTotalResults(merged.length);
    if (apiUnique.length > 0) {
      saveBooksToDB(apiUnique, lang);
    }
  } catch (err) {
    if (axios.isCancel(err)) return;
    setError(getErrorMessage(err));
  } finally {
    setLoading(false);
  }
}, []);
```

Puntos a entender:

- **`signal.aborted` tras cada `await`.** `searchBooksInDB` (Firestore) no es abortable con `AbortController`. Si el usuario teclea rápido, varios `fetchBooks` pueden correr a la vez. El `AbortController` aborta la petición a OL del anterior, pero no la query de Firestore. Por eso, tras cada `await`, se comprueba `if (signal.aborted) return` — cuando un `fetchBooks` nuevo aborta al anterior, el viejo se detiene en su siguiente check y no pisa el `setBooks` del nuevo.
- **`try/catch` interno alrededor de la llamada a OL.** Igual que en `searchBooksWithFallback`: un 422 (query corta) o un fallo de red no debe reventar la búsqueda. Si OL falla, se degrada a mostrar solo lo de BBDD (`apiUnique = []`). El `catch` externo solo captura errores genuinos del flujo (p. ej. que la propia query de Firestore falle).
- **`totalResults = books.length`** en las dos ramas — es el número de resultados mostrados, no el total global de OpenLibrary (decisión 3).
- **`saveBooksToDB(apiUnique, lang)`** — solo los resultados de OL que no estaban ya en BBDD. Se cachean (y de paso generan `titleTokens` + `authorTokens`), así que la próxima búsqueda igual los resuelve desde BBDD.

### C.3 El `lang` del caller

`fetchBooks` tiene `lang: string = "es"` por defecto. Hay que verificar que la página de Explorar le pasa el idioma actual (`i18n.language.split("-")[0]`). Si hoy se apoya en el default `"es"`, es un bug a corregir como parte de este batch — la búsqueda en BBDD por `titleTokens.{lang}` no funcionaría en inglés.

### C.4 Verificación Batch C

- [ ] Buscar por **título** un libro cacheado → sale de BBDD, sin llamada a OL (si hay 7+).
- [ ] Buscar por **título** algo no cacheado → BBDD ≤6 → fallback a OL → resultados combinados, y los de OL se cachean.
- [ ] Buscar por **autor** → funciona contra `authorTokens`.
- [ ] Buscar por **ISBN** → match exacto en BBDD, o fallback a OL.
- [ ] Cambiar el idioma de la app → la búsqueda y los títulos cambian.
- [ ] Teclear rápido no deja resultados obsoletos en pantalla (test del `signal.aborted`).
- [ ] Query corta tipo "el" → no revienta; degrada con elegancia.

---

## Comportamiento por filtro (referencia)

| Filtro | Búsqueda en BBDD | Búsqueda en API (`getSearchParams`) |
|--------|------------------|--------------------------------------|
| `todo` | `titleTokens.{lang}` | `{ q }` |
| `titulo` | `titleTokens.{lang}` | `{ title }` |
| `autor` | `authorTokens` (plano) | `{ author }` |
| `isbn` | `isbn` (match exacto) | `{ isbn }` |

---

## Archivos tocados (resumen)

| Archivo | Batch |
|---------|-------|
| `src/utils/titleSearch.ts` | A |
| `src/services/firebase/firebaseBooks.ts` | A, B |
| `scripts/backfill-title-tokens.cjs` (script de backfill) | A |
| `src/hooks/useBookSearch.ts` | C |
| Página de Explorar (caller de `fetchBooks`) — pasar `lang` | C |

---

## Fuera de alcance

- Coincidencia de prefijo intra-palabra (`pott` → *Potter*) — sigue en "Prioridad 4 / Futuro" del spec de favoritos.
- Búsqueda de ISBN contra `isbns.{lang}` además de `isbn` — solo se consulta el campo raíz `isbn`; lo no cubierto cae al fallback de OL.
- Unificar `searchBooksWithFallback` (favoritos) y el híbrido de Explorar en una sola función — son lo bastante distintos (umbral, filtros, `totalResults`, dedupe por título) como para mantenerlos separados.
- Guard de query-solo-stopwords en `useBookSearch` — el `try/catch` alrededor de la llamada a OL ya degrada con elegancia; un guard explícito solo ahorraría una llamada 422 desperdiciada (micro-optimización opcional).
