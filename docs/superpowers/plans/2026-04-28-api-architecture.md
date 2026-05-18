# API Architecture

## Clientes (`src/services/api/apiConnections.ts`)
- `openLibraryClient` — axios, baseURL `https://openlibrary.org`
- `googleBooksClient` — axios, baseURL `https://www.googleapis.com/books/v1`, **sin Content-Type header** (causaba 503s)

## APIs externas

### OpenLibrary (`src/services/api/openLibraryApi.ts`)
- Fantasy books: `GET /search.json?q=subject:fantasy&language=...` — fields incluyen `author_key`
- Search: `GET /search.json?...` — fields incluyen `author_key`
- Work detail: `GET /{workKey}.json`
- Author search: `GET /search/authors.json`
- Author works: `GET /authors/{authorKey}/works.json`
- Author books: `GET /search.json?q=author:{name}&language=...`
- Covers: `https://covers.openlibrary.org/b/id/{cover_id}-M.jpg`

### Google Books (`src/services/api/googleBooksApi.ts`)
- Cover: `GET /volumes?q=intitle:X+inauthor:Y&maxResults=1`
- Fantasy books: `GET /volumes?q=subject:fantasy&langRestrict=...`
- Synopsis (3 fallbacks): ISBN → title+author (es) → title+author (any)
- Requiere `VITE_GOOGLE_BOOKS_API_KEY`

### Wikipedia
- Author summary: `GET https://{lang}.wikipedia.org/api/rest_v1/page/summary/{title}` (es → en fallback)

## Firestore como capa de caché

### `Books` collection
- Cacheados por `saveBooksToDB` al cargar ExplorePage
- Incluyen `authorKeys: string[]` para vincular con autores
- `synopsis` se añade en la primera visita al detalle del libro
- `getAuthorBooksFromDB(authorKey, excludeTitle)` — query `where("authorKeys", "array-contains", authorKey)`

### `Authors` collection
- Cacheados al visitar la página de detalle de un libro
- Bio y foto de Wikipedia; se guarda con `cachedAt`

## Estrategia de caché por tipo de dato

| Dato | Cache 1 | Cache 2 | Fuente |
|---|---|---|---|
| Lista de libros explore | localStorage (24h) | Firestore | OpenLibrary |
| Portadas | localStorage | — | Google Books |
| Sinopsis | Firestore | — | Google Books |
| Bio/foto autor | Firestore | — | Wikipedia |
| Libros del autor | Firestore | — | OpenLibrary |

## ExplorePage — cover fetching strategy
**Hook:** `useFantasyBooks_GoogleOpen`

1. `fetchFantasyBooks` (OL) → libros con `cover_id`, sin `cover_url`
2. `setBooks` inmediato — UI visible sin esperar portadas
3. `fetchCovers` en background: `fetchGoogleCovers` en batches de 3, 200ms entre grupos
4. Cada portada: `fetchGoogleCoverWithRetry` (3 reintentos, backoff exponencial)
5. `onCoverReady(index, url)` → `setBooks` por libro (renderizado progresivo)
6. Al terminar: estado final a localStorage + Firestore

## Conocidos / decisiones
- `Content-Type: application/json` en GETs a Google Books causaba 503 → eliminado
- `ratings_average` y `ratings_count` de OpenLibrary **eliminados** de todos los mapeos — `rating`/`ratingCount` en `Book` reservados para valoraciones de usuarios propios
- `author_key` se pide en todos los searches para poder vincular libros con autores en DB
- Sinopsis vacía en Firestore ya no se usa como caché — se reintenta Google Books API (`cached !== null && cached.trim().length > 0`)
