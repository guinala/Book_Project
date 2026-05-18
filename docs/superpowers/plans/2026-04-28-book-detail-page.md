# BookDetailPage

Página de detalle de libro en `/book/:id`. El `id` es el work key de OpenLibrary codificado en URL (ej. `/works/OL123W`).

## Arquitectura de datos

### Datos del libro
- Vienen de `location.state.book` (tipo `Book`) — pasado por navegación desde BookCard/ShelfBookCard
- `useBookDetail` los usa directamente; no hay fetch de datos del libro en sí

### Sinopsis
- Cache-first: `books/{workKey}` en Firestore → miss o vacío → Google Books API → guarda en Firestore
- Sinopsis vacía en Firestore no se cachea — condición: `cached !== null && cached.trim().length > 0`

### Datos del autor (bio, foto, libros)
- `useAuthorData(name, title, authorKey?)` — cache-first en dos niveles:
  - Bio/foto: `Authors/{authorKey}` en Firestore → miss → Wikipedia API → guarda
  - Libros: `books where authorKeys array-contains authorKey` → < 2 resultados → OpenLibrary API
- `authorKey` viene de `bookFromState.authorKeys?.[0]` (primer autor)
- **Solo se muestra el primer autor** — ver tarea pendiente multi-autor
- Cada paso tiene su propio try/catch: un fallo en Firestore o OpenLibrary no mata la bio de Wikipedia
- Helper `fetchBioFromWikipedia(authorName)` extraído a nivel de módulo en `useAuthorData.ts`
- Reglas Firestore para `Authors`: `read: true, write: request.auth != null`

### Fallback estático
- `getBookDetailById` en `bookDetailData.ts` devuelve `NOMBRE_DEL_VIENTO` para cualquier key desconocido (comportamiento intencional como placeholder)
- `authorInfo ?? book.authorInfo` en `BookDetailPage`: muestra el fallback estático brevemente hasta que `useAuthorData` completa el fetch

## Archivos clave
- `src/types/BookDetail.ts` — `BookDetail`, `AuthorInfo`, `AuthorBook`, `Review`, `ShelfStatus`
- `src/hooks/useBookDetail.ts` — carga sinopsis con cache-first
- `src/hooks/useAuthorData.ts` — carga autor con cache-first (Firestore → Wikipedia/OL)
- `src/pages/BookDetailPage/BookDetailPage.tsx`
- `src/services/firebase/firebase_books.ts` — `getSynopsisFromDB`, `saveSynopsisToDB`, `getAuthorBooksFromDB`
- `src/services/firebase/firebase_authors.ts` — `getAuthorFromDB`, `saveAuthorToDB`
- `src/data/bookDetailData.ts` — datos estáticos, fallback `NOMBRE_DEL_VIENTO`
- Componentes: `BookInfoCard`, `ReviewsSection`, `AuthorSection`, `RecommendationsSection`

## Navegación
- `BookCard.tsx` → navega a `/book/${book.key}` pasando `{ state: { book } }`
- `ShelfBookCard.tsx` → idem

## Tarea pendiente: soporte multi-autor
Actualmente `BookDetail.author: string` y `BookDetail.authorKey?: string` solo guardan el primer autor.
Para soportar varios autores:
1. Cambiar a `authors: string[]` y `authorKeys?: string[]` en `BookDetail`
2. `useAuthorData` debe iterar todos los keys en paralelo
3. `AuthorSection` debe renderizar una sección por autor
