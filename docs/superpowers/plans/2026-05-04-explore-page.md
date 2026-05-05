# Página Explorar — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar ExplorePage con 6 secciones independientes (versión con login / sin login), una subpágina "Ver más" por sección, carga lazy por sección con skeleton/error/retry, y scroll restoration al volver.

**Architecture:** Cada sección es un componente `ExploreSection` independiente que usa el hook `useExploreSection(type, params)` para cargar sus datos sin bloquear al resto. `ExplorePage` detecta el estado de auth y los datos del shelf para derivar los parámetros dinámicos (género favorito, autor favorito, libro de referencia) y los pasa a cada sección. `ExploreSectionPage` es la subpágina genérica que lee `:type` y los query params de la URL para mostrar todos los libros de una sección.

**Tech Stack:** React 19, TypeScript, Firebase Firestore, react-router, react-i18next, SCSS BEM, tokens CSS custom properties existentes.

---

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Crear | `src/types/ExploreTypes.ts` | Tipos `ExploreSectionType`, `ExploreSectionParams`, `UseSectionResult` |
| Crear | `src/hooks/useExploreSection.ts` | Hook unificado de datos por sección |
| Crear | `src/components/explore/ExploreGridSkeleton.tsx` | Skeleton de 6 cards en grid |
| Crear | `src/components/explore/ExploreGridSkeleton.scss` | Estilos del skeleton |
| Crear | `src/components/explore/ExploreSection.tsx` | Componente de sección: título + grid/skeleton/error + "Ver más" |
| Crear | `src/components/explore/ExploreSection.scss` | Estilos de la sección |
| Crear | `src/components/explore/ExploreConversionBanner.tsx` | Banner de conversión para usuarios guest |
| Crear | `src/components/explore/ExploreConversionBanner.scss` | Estilos del banner |
| Crear | `src/pages/explore/section/ExploreSectionPage.tsx` | Subpágina "Ver más" |
| Crear | `src/pages/explore/section/ExploreSectionPage.scss` | Estilos de la subpágina |
| Modificar | `src/services/firebase/firebaseBooks.ts` | Añadir 6 funciones de query para las secciones guest |
| Modificar | `src/services/firebase/firebaseLibrary.ts` | Incrementar `addCount` en Books al añadir al shelf |
| Modificar | `src/routes/routes.tsx` | Añadir ruta `/explore/section/:type` |
| Modificar | `src/pages/explore/ExplorePage.tsx` | Reescritura completa con secciones |
| Modificar | `src/pages/explore/ExplorePage.scss` | Estilos de secciones y layout |
| Modificar | `src/plugins/i18n/locales/es/explore.json` | Nuevas claves para secciones |
| Modificar | `src/plugins/i18n/locales/en/explore.json` | Nuevas claves para secciones |

---

## Task 1: Tipos + i18n + ruta

**Files:**
- Create: `src/types/ExploreTypes.ts`
- Modify: `src/routes/routes.tsx`
- Modify: `src/plugins/i18n/locales/es/explore.json`
- Modify: `src/plugins/i18n/locales/en/explore.json`

- [ ] **Step 1: Crear tipos de sección**

Crear `src/types/ExploreTypes.ts`:

```typescript
export type ExploreSectionType =
  | "trending"
  | "top-rated"
  | "fiction"
  | "non-fiction"
  | "new-releases"
  | "quick-reads"
  | "because-reading"
  | "more-genre"
  | "new-releases-for-you"
  | "waiting"
  | "more-author";

export type ExploreSectionParams = {
  // Secciones dinámicas logged-in
  referenceBookKey?: string;   // "because-reading"
  referenceBookTitle?: string; // "because-reading" (display, truncado a 40 chars)
  referenceGenre?: string;     // "because-reading"
  favoriteGenre?: string;      // "more-genre"
  favoriteAuthorKey?: string;  // "more-author"
  favoriteAuthorName?: string; // "more-author" (display)
  userAuthorKeys?: string[];   // "new-releases-for-you"
  userShelfKeys?: Set<string>; // para filtrar libros ya en shelf
  wantToReadBooks?: import("@/types/Book").Book[]; // "waiting" (pre-cargados del contexto)
};

export type UseSectionResult = {
  books: import("@/types/Book").Book[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  isFallback: boolean;
};
```

- [ ] **Step 2: Añadir claves i18n (ES)**

Reemplazar el contenido de `src/plugins/i18n/locales/es/explore.json`:

```json
{
  "explore": {
    "searchPlaceholder": "Busca por título, autor o ISBN",
    "searching": "Buscando...",
    "resultsFound": "{{count}} resultados encontrados",
    "backBtn": "Volver",
    "resultsTitle": "Resultados para \"{{query}}\"",
    "fantasyTitle": "Fantasía",
    "saveTooltip": "Inicia sesión para guardar",
    "seeMore": "Ver más",
    "retry": "Reintentar",
    "sectionError": "No se pudo cargar esta sección",
    "sections": {
      "trending": "Tendencias esta semana",
      "trendingFallback": "Populares en Trama",
      "topRated": "Mejor valorados",
      "fiction": "Ficción",
      "nonFiction": "No ficción",
      "newReleases": "Nuevos lanzamientos",
      "newReleasesFallback": "Novedades destacadas",
      "quickReads": "Rápidos y muy buenos",
      "becauseReading": "Porque estás leyendo",
      "moreGenre": "Más de {{genre}}",
      "newReleasesForYou": "Nuevos lanzamientos para ti",
      "waiting": "Siguen esperando",
      "moreAuthor": "Más de {{author}}"
    },
    "banner": {
      "title": "Descubre libros para ti",
      "body": "Crea una cuenta para ver recomendaciones personalizadas según lo que lees.",
      "cta": "Crear cuenta"
    }
  },
  "search": {
    "all": "Todo",
    "title": "Título",
    "author": "Autor",
    "isbn": "ISBN",
    "searchLabel": "Buscar Libros",
    "clearLabel": "Borrar Búsqueda",
    "searchBtnLabel": "Buscar"
  }
}
```

- [ ] **Step 3: Añadir claves i18n (EN)**

Reemplazar el contenido de `src/plugins/i18n/locales/en/explore.json`:

```json
{
  "explore": {
    "searchPlaceholder": "Search by title, author or ISBN",
    "searching": "Searching...",
    "resultsFound": "{{count}} results found",
    "backBtn": "Back",
    "resultsTitle": "Results for \"{{query}}\"",
    "fantasyTitle": "Fantasy",
    "saveTooltip": "Sign in to save",
    "seeMore": "See more",
    "retry": "Retry",
    "sectionError": "Could not load this section",
    "sections": {
      "trending": "Trending this week",
      "trendingFallback": "Popular on Trama",
      "topRated": "Top rated",
      "fiction": "Fiction",
      "nonFiction": "Non-fiction",
      "newReleases": "New releases",
      "newReleasesFallback": "Featured releases",
      "quickReads": "Short and great",
      "becauseReading": "Because you're reading",
      "moreGenre": "More {{genre}}",
      "newReleasesForYou": "New releases for you",
      "waiting": "Still waiting",
      "moreAuthor": "More by {{author}}"
    },
    "banner": {
      "title": "Discover books for you",
      "body": "Create an account to see personalized recommendations based on what you read.",
      "cta": "Create account"
    }
  },
  "search": {
    "all": "All",
    "title": "Title",
    "author": "Author",
    "isbn": "ISBN",
    "searchLabel": "Search books",
    "clearLabel": "Clear search",
    "searchBtnLabel": "Search"
  }
}
```

- [ ] **Step 4: Añadir ruta de subpágina**

En `src/routes/routes.tsx`, añadir la importación y la ruta (dejar el import de `ExploreSectionPage` comentado como `// TODO: import after Task 9` para que compile ahora — o añadirlo ya si Task 9 se ejecuta en la misma sesión):

```typescript
// Añadir import (puede quedar pendiente si el archivo aún no existe):
// import ExploreSectionPage from "@/pages/explore/section/ExploreSectionPage";

// Dentro del array children de "/", añadir después de la ruta "explore":
{ path: "explore/section/:type", element: <ExploreSectionPage /> },
```

**Nota:** Este import causará error de compilación hasta que se cree `ExploreSectionPage` en Task 9. Alternativa: añadir este step al final del Task 9.

- [ ] **Step 5: Build check**

```bash
npm run build
```

Esperado: sin errores de tipo (el import de ExploreSectionPage puede añadirse en Task 9).

- [ ] **Step 6: Commit**

```bash
git add src/types/ExploreTypes.ts src/plugins/i18n/locales/es/explore.json src/plugins/i18n/locales/en/explore.json
git commit -m "feat(explore): tipos, i18n y ruta de sección"
```

---

## Task 2: Firebase — queries para secciones

**Files:**
- Modify: `src/services/firebase/firebaseBooks.ts`

Añadir al final del archivo. Todas las queries fetchan más docs de los necesarios y filtran/ordenan en cliente para evitar índices compuestos de Firestore.

- [ ] **Step 1: Añadir imports y función getTrendingBooks**

Añadir `orderBy` al import existente de firebase/firestore. Luego añadir al final del archivo:

```typescript
import { arrayUnion, collection, doc, getDoc, getDocs, increment, limit, orderBy, query, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
```

```typescript
function mapBookDoc(data: ReturnType<typeof import("@firebase/firestore").DocumentSnapshot.prototype.data>, lang: string): import("@/types/Book").Book {
  return {
    key: data.key,
    title: data.titles?.[lang] ?? data.titles?.es ?? data.titles?.en ?? data.title ?? "",
    titles: data.titles ?? {},
    authors: data.authors,
    authorKeys: data.authorKeys ?? undefined,
    first_publish_year: data.first_publish_year,
    cover_id: data.cover_id,
    cover_url: data.cover_url ?? undefined,
    edition_count: data.edition_count,
    genre: data.genre ?? undefined,
    rating: data.rating ?? undefined,
    ratingCount: data.ratingCount ?? undefined,
    isbn: data.isbns?.[lang] ?? data.isbns?.es ?? data.isbns?.en ?? data.isbn ?? undefined,
    isbns: data.isbns ?? undefined,
    pages: data.pages ?? undefined,
  };
}
```

**Nota:** `mapBookDoc` evita duplicar el mapping en cada función. El tipo del parámetro puede simplificarse a `Record<string, any>` para evitar el import complejo de Firestore:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBookDoc(data: Record<string, any>, lang: string): Book {
  return {
    key: data.key,
    title: data.titles?.[lang] ?? data.titles?.es ?? data.titles?.en ?? data.title ?? "",
    titles: data.titles ?? {},
    authors: data.authors,
    authorKeys: data.authorKeys ?? undefined,
    first_publish_year: data.first_publish_year,
    cover_id: data.cover_id,
    cover_url: data.cover_url ?? undefined,
    edition_count: data.edition_count,
    genre: data.genre ?? undefined,
    rating: data.rating ?? undefined,
    ratingCount: data.ratingCount ?? undefined,
    isbn: data.isbns?.[lang] ?? data.isbns?.es ?? data.isbns?.en ?? data.isbn ?? undefined,
    isbns: data.isbns ?? undefined,
    pages: data.pages ?? undefined,
  };
}

export async function getTrendingBooks(lang: string, count = 6): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("langs", "array-contains", lang),
    orderBy("addCount", "desc"),
    limit(count + 10),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => mapBookDoc(d.data(), lang)).slice(0, count);
}
```

- [ ] **Step 2: Añadir getTopRatedBooks**

```typescript
export async function getTopRatedBooks(lang: string, count = 6): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("langs", "array-contains", lang),
    where("rating", ">=", 3.5),
    limit(60),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => mapBookDoc(d.data(), lang))
    .filter(b => (b.ratingCount ?? 0) >= 10)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, count);
}
```

- [ ] **Step 3: Añadir getBooksByGenre**

```typescript
export async function getBooksByGenre(genre: string, lang: string, count = 6): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("langs", "array-contains", lang),
    where("genre", "==", genre),
    limit(count + 20),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => mapBookDoc(d.data(), lang))
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, count);
}
```

- [ ] **Step 4: Añadir getNewReleaseBooks**

```typescript
export async function getNewReleaseBooks(year: number, lang: string, count = 6): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("langs", "array-contains", lang),
    where("first_publish_year", ">=", year),
    limit(count + 20),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => mapBookDoc(d.data(), lang))
    .filter(b => (b.rating ?? 0) >= 3)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, count);
}
```

- [ ] **Step 5: Añadir getQuickAndGoodBooks**

```typescript
export async function getQuickAndGoodBooks(lang: string, count = 6): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("langs", "array-contains", lang),
    where("rating", ">=", 4),
    limit(80),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => mapBookDoc(d.data(), lang))
    .filter(b => b.pages !== undefined && b.pages > 0 && b.pages < 300)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, count);
}
```

- [ ] **Step 6: Añadir getAuthorNewReleases y getRecommendationsByGenre**

```typescript
export async function getAuthorNewReleases(
  authorKeys: string[],
  year: number,
  minRating: number,
  lang: string,
  count = 6,
): Promise<Book[]> {
  if (authorKeys.length === 0) return [];
  // array-contains-any admite máximo 10 valores
  const keys = authorKeys.slice(0, 10);
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("authorKeys", "array-contains-any", keys),
    where("first_publish_year", ">=", year),
    limit(count + 20),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => mapBookDoc(d.data(), lang))
    .filter(b => (b.rating ?? 0) >= minRating)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, count);
}

// Versión de getRecommendationsFromDB sin mínimo requerido
export async function getRecommendationsByGenre(
  genre: string,
  lang: string,
  excludeKey: string,
  count = 6,
): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("genre", "==", genre),
    where("langs", "array-contains", lang),
    limit(count + 10),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => mapBookDoc(d.data(), lang))
    .filter(b => b.key !== excludeKey)
    .slice(0, count);
}
```

- [ ] **Step 7: Añadir incrementTrendingCount (exportada, usada en Task 3)**

```typescript
export async function incrementBookAddCount(bookKey: string): Promise<void> {
  const ref = doc(db, BOOKS_COLLECTION, encodeKey(bookKey));
  await setDoc(ref, { addCount: increment(1) }, { merge: true });
}
```

- [ ] **Step 8: Build check**

```bash
npm run build
```

Esperado: sin errores. Si Firestore lanza error en runtime sobre índices faltantes, lo mostrará como link en la consola del navegador (no en build).

- [ ] **Step 9: Commit**

```bash
git add src/services/firebase/firebaseBooks.ts
git commit -m "feat(explore): queries de sección para Books en Firestore"
```

---

## Task 3: Trending — incremento de addCount al añadir al shelf

**Files:**
- Modify: `src/services/firebase/firebaseLibrary.ts`

- [ ] **Step 1: Añadir import y llamada en addToShelf**

En `firebaseLibrary.ts`, añadir `import { incrementBookAddCount } from "./firebaseBooks";` al principio (después de los imports existentes).

Dentro de `addToShelf`, después del bloque de `logActivity` existente (al final de la función, antes del `return`), añadir:

```typescript
// Incrementar contador global de tendencias (fire-and-forget)
incrementBookAddCount(book.key)
  .catch(err => console.warn("[addToShelf] incrementTrending failed:", err));
```

La función completa queda:

```typescript
export async function addToShelf(
  uid: string,
  book: Book,
  status: ShelfStatus,
  prevStatus?: ShelfStatus | null
): Promise<void> {
  const shelfRef = doc(db, "Users", uid, "Shelf", encodeKey(book.key));
  const { titles, isbns, ...bookData } = book;
  await setDoc(shelfRef, {
    ...bookData,
    status,
    addedAt: new Date().toISOString(),
  }, { merge: true });

  if (titles && Object.keys(titles).length > 0) {
    const langUpdates: Record<string, string> = {};
    for (const [lang, t] of Object.entries(titles)) {
      langUpdates[`titles.${lang}`] = t;
    }
    if (isbns) {
      for (const [lang, isbn] of Object.entries(isbns)) {
        langUpdates[`isbns.${lang}`] = isbn;
      }
    }
    await updateDoc(shelfRef, langUpdates);
  }

  if (prevStatus === status) return;

  const base = {
    bookId: book.key,
    bookTitle: book.title,
    bookCoverUrl: book.cover_url,
    bookAuthor: book.authors[0],
  };

  if (status === "wantToRead") {
    logActivity(uid, { type: "watchlist_add", ...base })
      .catch((err) => console.warn("[addToShelf] logActivity failed:", err));
  } else if (status === "reading") {
    logActivity(uid, { type: "reading_started", ...base })
      .catch((err) => console.warn("[addToShelf] logActivity failed:", err));
  } else if (status === "finished") {
    logActivity(uid, { type: "book_finished", ...base })
      .catch((err) => console.warn("[addToShelf] logActivity failed:", err));
  }

  // Incrementar contador global de tendencias (fire-and-forget)
  incrementBookAddCount(book.key)
    .catch(err => console.warn("[addToShelf] incrementTrending failed:", err));
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/services/firebase/firebaseLibrary.ts
git commit -m "feat(explore): incrementar addCount en Books al añadir al shelf"
```

---

## Task 4: Hook useExploreSection

**Files:**
- Create: `src/hooks/useExploreSection.ts`

El hook encapsula toda la lógica de fetching por tipo de sección. Todos los parámetros dependientes del shelf se reciben del exterior (no llama a useShelf internamente).

- [ ] **Step 1: Crear el hook**

Crear `src/hooks/useExploreSection.ts`:

```typescript
import { useCallback, useEffect, useState } from "react";
import type { Book } from "@/types/Book";
import type { ExploreSectionParams, ExploreSectionType, UseSectionResult } from "@/types/ExploreTypes";
import {
  getAuthorBooksFromDB,
  getAuthorNewReleases,
  getBooksByGenre,
  getNewReleaseBooks,
  getQuickAndGoodBooks,
  getRecommendationsByGenre,
  getTopRatedBooks,
  getTrendingBooks,
} from "@/services/firebase/firebaseBooks";

export function useExploreSection(
  type: ExploreSectionType,
  params: ExploreSectionParams = {},
  lang: string,
  count = 6,
): UseSectionResult {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSection(type, params, lang, count);
      setBooks(result.books);
      setIsFallback(result.isFallback);
    } catch {
      setError("error");
    } finally {
      setLoading(false);
    }
  // params es un objeto nuevo en cada render; desestructuramos las deps relevantes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, lang, count,
    params.referenceBookKey, params.referenceGenre,
    params.favoriteGenre, params.favoriteAuthorKey,
    params.userAuthorKeys?.join(","),
  ]);

  useEffect(() => { fetch(); }, [fetch]);

  return { books, loading, error, retry: fetch, isFallback };
}

type FetchResult = { books: Book[]; isFallback: boolean };

async function fetchSection(
  type: ExploreSectionType,
  params: ExploreSectionParams,
  lang: string,
  count: number,
): Promise<FetchResult> {
  const year = new Date().getFullYear();

  switch (type) {
    case "trending": {
      const books = await getTrendingBooks(lang, count);
      if (books.length > 0) return { books, isFallback: false };
      // Fallback: top-rated
      return { books: await getTopRatedBooks(lang, count), isFallback: true };
    }

    case "top-rated":
      return { books: await getTopRatedBooks(lang, count), isFallback: false };

    case "fiction":
      return { books: await getBooksByGenre("Fiction", lang, count), isFallback: false };

    case "non-fiction":
      return { books: await getBooksByGenre("Non-Fiction", lang, count), isFallback: false };

    case "new-releases":
      return { books: await getNewReleaseBooks(year, lang, count), isFallback: false };

    case "quick-reads":
      return { books: await getQuickAndGoodBooks(lang, count), isFallback: false };

    case "because-reading": {
      if (!params.referenceBookKey || !params.referenceGenre) return { books: [], isFallback: false };
      const raw = await getRecommendationsByGenre(params.referenceGenre, lang, params.referenceBookKey, count + 10);
      const books = raw
        .filter(b => !params.userShelfKeys?.has(b.key))
        .slice(0, count);
      return { books, isFallback: false };
    }

    case "more-genre": {
      if (!params.favoriteGenre) return { books: [], isFallback: false };
      const raw = await getRecommendationsByGenre(params.favoriteGenre, lang, "", count + 10);
      const books = raw
        .filter(b => !params.userShelfKeys?.has(b.key))
        .slice(0, count);
      return { books, isFallback: false };
    }

    case "new-releases-for-you": {
      if (params.userAuthorKeys && params.userAuthorKeys.length > 0) {
        const raw = await getAuthorNewReleases(params.userAuthorKeys, year, 3, lang, count + 10);
        const filtered = raw
          .filter(b => !params.userShelfKeys?.has(b.key))
          .slice(0, count);
        if (filtered.length >= 6) return { books: filtered, isFallback: false };
      }
      // Fallback a novedades generales
      return { books: await getNewReleaseBooks(year, lang, count), isFallback: true };
    }

    case "waiting": {
      const books = (params.wantToReadBooks ?? []).slice(0, count);
      return { books, isFallback: false };
    }

    case "more-author": {
      if (!params.favoriteAuthorKey) return { books: [], isFallback: false };
      const raw = await getAuthorBooksFromDB(params.favoriteAuthorKey, "", lang);
      const books = raw
        .filter(b => !params.userShelfKeys?.has(b.key))
        .slice(0, count);
      return { books, isFallback: false };
    }

    default:
      return { books: [], isFallback: false };
  }
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useExploreSection.ts src/types/ExploreTypes.ts
git commit -m "feat(explore): hook useExploreSection con todos los tipos de sección"
```

---

## Task 5: ExploreGridSkeleton + ExploreSection

**Files:**
- Create: `src/components/explore/ExploreGridSkeleton.tsx`
- Create: `src/components/explore/ExploreGridSkeleton.scss`
- Create: `src/components/explore/ExploreSection.tsx`
- Create: `src/components/explore/ExploreSection.scss`

- [ ] **Step 1: Crear ExploreGridSkeleton.tsx**

Crear `src/components/explore/ExploreGridSkeleton.tsx`:

```typescript
import "./ExploreGridSkeleton.scss";

export default function ExploreGridSkeleton() {
  return (
    <div className="explore-grid-skeleton">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="explore-grid-skeleton__card">
          <div className="explore-grid-skeleton__cover" />
          <div className="explore-grid-skeleton__line explore-grid-skeleton__line--title" />
          <div className="explore-grid-skeleton__line explore-grid-skeleton__line--author" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Crear ExploreGridSkeleton.scss**

Crear `src/components/explore/ExploreGridSkeleton.scss`:

```scss
@use '../../styles/lib' as *;

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

%shimmer {
  background: linear-gradient(
    90deg,
    var(--color-neutral-alpha-muted) 25%,
    var(--color-border-subtle) 50%,
    var(--color-neutral-alpha-muted) 75%
  );
  @include shimmer-bg;
  border-radius: var(--radius-sm);
}

.explore-grid-skeleton {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);

  @include from($bp-md) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  @include from($bp-lg) {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: var(--space-4);
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-2) var(--space-3);
    background: var(--color-bg-card-solid);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-lg);
  }

  &__cover {
    @extend %shimmer;
    width: 100%;
    aspect-ratio: 2 / 3;
    border-radius: var(--radius-md);
  }

  &__line {
    @extend %shimmer;
    height: 12px;

    &--title {
      width: 85%;
    }

    &--author {
      width: 60%;
    }
  }
}
```

- [ ] **Step 3: Crear ExploreSection.tsx**

Crear `src/components/explore/ExploreSection.tsx`:

```typescript
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import BookGridCard from "@/components/book/cards/BookGridCard";
import ExploreGridSkeleton from "./ExploreGridSkeleton";
import type { ExploreSectionParams, ExploreSectionType } from "@/types/ExploreTypes";
import { useExploreSection } from "@/hooks/useExploreSection";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import "./ExploreSection.scss";

type ExploreSectionProps = {
  type: ExploreSectionType;
  params?: ExploreSectionParams;
  /** Título fijo (se usa para secciones cuyo título no depende de isFallback).
   *  Si no se pasa, el componente lo calcula desde i18n. */
  titleKey?: string;
  titleFallbackKey?: string;
  /** Scroll position key para sessionStorage (pasado desde ExplorePage). */
  onNavigate?: () => void;
};

function buildSectionUrl(type: ExploreSectionType, params: ExploreSectionParams = {}): string {
  const base = `/explore/section/${type}`;
  const search = new URLSearchParams();
  if (params.referenceBookKey) search.set("bookKey", params.referenceBookKey);
  if (params.referenceBookTitle) search.set("bookTitle", params.referenceBookTitle);
  if (params.referenceGenre) search.set("genre", params.referenceGenre);
  if (params.favoriteGenre) search.set("genre", params.favoriteGenre);
  if (params.favoriteAuthorKey) search.set("authorKey", params.favoriteAuthorKey);
  if (params.favoriteAuthorName) search.set("authorName", params.favoriteAuthorName);
  if (params.userAuthorKeys?.length) search.set("authorKeys", params.userAuthorKeys.join(","));
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

export default function ExploreSection({
  type,
  params = {},
  titleKey,
  titleFallbackKey,
  onNavigate,
}: ExploreSectionProps) {
  const { t } = useTranslation();
  const { lang } = useCurrentLanguage();
  const navigate = useNavigate();
  const { books, loading, error, retry, isFallback } = useExploreSection(type, params, lang, 6);

  const resolvedTitleKey = isFallback && titleFallbackKey ? titleFallbackKey : titleKey;
  const title = resolvedTitleKey ? t(resolvedTitleKey, {
    genre: params.favoriteGenre,
    author: params.favoriteAuthorName,
  }) : "";

  const handleSeeMore = () => {
    onNavigate?.();
    navigate(buildSectionUrl(type, params));
  };

  if (!loading && !error && books.length === 0) return null;

  return (
    <section className="explore-section">
      <div className="explore-section__header">
        <h2 className="explore-section__title">{title}</h2>
        {!loading && !error && books.length > 0 && (
          <button
            type="button"
            className="explore-section__see-more"
            onClick={handleSeeMore}
          >
            {t("explore.seeMore")}
          </button>
        )}
      </div>

      {loading && <ExploreGridSkeleton />}

      {error && (
        <div className="explore-section__error">
          <p className="explore-section__error-text">{t("explore.sectionError")}</p>
          <button
            type="button"
            className="explore-section__retry"
            onClick={retry}
          >
            {t("explore.retry")}
          </button>
        </div>
      )}

      {!loading && !error && books.length > 0 && (
        <div className="explore-section__grid">
          {books.map(book => (
            <BookGridCard key={book.key} book={book} />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Crear ExploreSection.scss**

Crear `src/components/explore/ExploreSection.scss`:

```scss
@use '../../styles/lib' as *;

.explore-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  &__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-4);
  }

  &__title {
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    margin: 0;

    @include from($bp-md) {
      font-size: var(--text-2xl);
    }
  }

  &__see-more {
    @include ghost-button;
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-brand-primary);
    padding: 0;
    white-space: nowrap;
    flex-shrink: 0;

    &:hover {
      opacity: 0.75;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
    align-items: start;

    @include from($bp-md) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    @include from($bp-lg) {
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: var(--space-4);
    }
  }

  &__error {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-6) 0;
  }

  &__error-text {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  &__retry {
    @include ghost-button;
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-brand-primary);
    padding: 0;

    &:hover {
      opacity: 0.75;
    }
  }
}
```

- [ ] **Step 5: Build check**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/explore/
git commit -m "feat(explore): ExploreGridSkeleton y ExploreSection"
```

---

## Task 6: ExploreConversionBanner

**Files:**
- Create: `src/components/explore/ExploreConversionBanner.tsx`
- Create: `src/components/explore/ExploreConversionBanner.scss`

- [ ] **Step 1: Crear ExploreConversionBanner.tsx**

Crear `src/components/explore/ExploreConversionBanner.tsx`:

```typescript
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import "./ExploreConversionBanner.scss";

export default function ExploreConversionBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="explore-banner">
      <div className="explore-banner__content">
        <p className="explore-banner__title">{t("explore.banner.title")}</p>
        <p className="explore-banner__body">{t("explore.banner.body")}</p>
      </div>
      <button
        type="button"
        className="explore-banner__cta"
        onClick={() => navigate("/auth")}
      >
        {t("explore.banner.cta")}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Crear ExploreConversionBanner.scss**

Crear `src/components/explore/ExploreConversionBanner.scss`:

```scss
@use '../../styles/lib' as *;

.explore-banner {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-6) var(--space-6);
  background: var(--color-brand-alpha-subtle);
  border: 1px solid var(--color-brand-alpha-medium);
  border-radius: var(--radius-xl);

  @include from($bp-md) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  &__title {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
  }

  &__body {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  &__cta {
    align-self: flex-start;
    padding: var(--space-3) var(--space-6);
    background: var(--color-brand-primary);
    color: var(--color-text-on-brand);
    border: none;
    border-radius: var(--radius-pill);
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    @include transition(background);

    &:hover {
      background: var(--color-brand-dark);
    }

    @include from($bp-md) {
      align-self: center;
    }
  }
}
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/explore/ExploreConversionBanner.tsx src/components/explore/ExploreConversionBanner.scss
git commit -m "feat(explore): banner de conversión para usuarios guest"
```

---

## Task 7: Reescritura de ExplorePage

**Files:**
- Modify: `src/pages/explore/ExplorePage.tsx`
- Modify: `src/pages/explore/ExplorePage.scss`

Esta es la pieza central. Gestiona: detección de auth/shelf, derivación de parámetros dinámicos, lista de secciones a mostrar, scroll restoration.

- [ ] **Step 1: Utilidad de truncado de título**

Añadir al principio del archivo ExplorePage.tsx (debajo de imports):

```typescript
function truncate(text: string, max = 40): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}
```

- [ ] **Step 2: Reescribir ExplorePage.tsx**

Reemplazar el contenido completo de `src/pages/explore/ExplorePage.tsx`:

```typescript
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useShelf } from "@/hooks/useShelf";
import { useBookSearch } from "@/hooks/useBookSearch";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import SearchBar from "@/components/common/Searchbar";
import BookGridCard from "@/components/book/cards/BookGridCard";
import GridLoading from "@/components/layout/GridLoading";
import ExploreSection from "@/components/explore/ExploreSection";
import ExploreConversionBanner from "@/components/explore/ExploreConversionBanner";
import type { ExploreSectionParams } from "@/types/ExploreTypes";
import type { SearchFilter } from "@/types/Search";
import "./ExplorePage.scss";

const SCROLL_KEY = "explore_scroll";

function truncate(text: string, max = 40): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function ExplorePage() {
  const { t } = useTranslation();
  const { lang } = useCurrentLanguage();
  const { isAuthenticated, isGuest } = useAuth();
  const { shelfByStatus, loading: shelfLoading } = useShelf();
  const search = useBookSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRestored = useRef(false);

  const isLoggedIn = isAuthenticated && !isGuest;
  const isSearching = searchQuery.trim().length > 0;

  // Scroll restoration al montar
  useEffect(() => {
    if (scrollRestored.current) return;
    scrollRestored.current = true;
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) {
      window.scrollTo(0, parseInt(saved, 10));
      sessionStorage.removeItem(SCROLL_KEY);
    }
  }, []);

  const handleNavigateToSection = () => {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
  };

  // Derivar parámetros dinámicos a partir del shelf
  const shelfDerived = useMemo(() => {
    if (!isLoggedIn || shelfLoading) return null;

    const allBooks = [
      ...shelfByStatus.reading,
      ...shelfByStatus.finished,
      ...shelfByStatus.wantToRead,
      ...shelfByStatus.didNotFinish,
    ];

    const userShelfKeys = new Set(allBooks.map(b => b.key));

    // Libro de referencia para "because-reading"
    const readingBook = shelfByStatus.reading[0] ?? null;
    const highRatedBook = [...shelfByStatus.finished, ...shelfByStatus.reading]
      .find(b => (b.rating ?? 0) >= 4) ?? null;
    const referenceBook = readingBook ?? highRatedBook;

    // Género favorito (más frecuente en finished + reading)
    const genreCounts: Record<string, number> = {};
    for (const b of [...shelfByStatus.finished, ...shelfByStatus.reading]) {
      if (b.genre) genreCounts[b.genre] = (genreCounts[b.genre] ?? 0) + 1;
    }
    const favoriteGenre = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Autor favorito (el que aparece en ≥2 libros de finished/reading con rating ≥4, o simplemente más frecuente)
    const authorKeyCounts: Record<string, { count: number; name: string }> = {};
    for (const b of [...shelfByStatus.finished, ...shelfByStatus.reading]) {
      for (let i = 0; i < (b.authorKeys?.length ?? 0); i++) {
        const key = b.authorKeys![i];
        const name = b.authors[i] ?? b.authors[0];
        const prev = authorKeyCounts[key];
        authorKeyCounts[key] = { count: (prev?.count ?? 0) + 1, name: prev?.name ?? name };
      }
    }
    const favoriteAuthor = Object.entries(authorKeyCounts)
      .filter(([, v]) => v.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)[0];

    // AuthorKeys de todos los libros en el shelf (para "new-releases-for-you")
    const userAuthorKeys = [...new Set(
      allBooks.flatMap(b => b.authorKeys ?? [])
    )];

    return {
      userShelfKeys,
      referenceBook,
      favoriteGenre,
      favoriteAuthorKey: favoriteAuthor?.[0] ?? null,
      favoriteAuthorName: favoriteAuthor?.[1].name ?? null,
      userAuthorKeys,
      wantToReadBooks: shelfByStatus.wantToRead,
      hasBooks: allBooks.length > 0,
    };
  }, [isLoggedIn, shelfLoading, shelfByStatus]);

  const handleSearch = (query: string, filter: SearchFilter) => {
    setSearchQuery(query);
    if (query.trim()) search.fetchBooks(query, filter, 20, lang);
    else search.resetBookResults();
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    search.resetBookResults();
  };

  // Secciones de usuario sin actividad: mostrar versión guest
  const showGuestVersion = !isLoggedIn || (shelfDerived !== null && !shelfDerived.hasBooks);

  // Parámetros comunes para secciones logged-in
  const shelfParams: Partial<ExploreSectionParams> = shelfDerived
    ? { userShelfKeys: shelfDerived.userShelfKeys, userAuthorKeys: shelfDerived.userAuthorKeys }
    : {};

  return (
    <>
      <SearchBar onSearch={handleSearch} />

      {isSearching && (
        <div className="explore-page__search-status">
          <p>
            {search.loading
              ? t("explore.searching")
              : t("explore.resultsFound", { count: search.totalResults })}
          </p>
          <button onClick={handleClearSearch} className="explore-page__clear-btn">
            {t("explore.backBtn")}
          </button>
        </div>
      )}

      {isSearching ? (
        <section className="explore-page__section">
          {search.loading && <GridLoading />}
          {search.error && <p className="explore-page__error">{search.error}</p>}
          {!search.loading && !search.error && (
            <div className="explore-page__search-grid">
              {search.books.map(book => (
                <BookGridCard key={book.key} book={book} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="explore-page__sections">

          {/* Sección 1 — Tendencias (ambas versiones) */}
          <ExploreSection
            type="trending"
            params={shelfParams}
            titleKey="explore.sections.trending"
            titleFallbackKey="explore.sections.trendingFallback"
            onNavigate={handleNavigateToSection}
          />

          {showGuestVersion ? (
            <>
              {/* Sección 2 — Mejor valorados */}
              <ExploreSection
                type="top-rated"
                titleKey="explore.sections.topRated"
                onNavigate={handleNavigateToSection}
              />

              {/* Banner de conversión (solo guest) */}
              {isGuest && <ExploreConversionBanner />}

              {/* Sección 3 — Ficción */}
              <ExploreSection
                type="fiction"
                titleKey="explore.sections.fiction"
                onNavigate={handleNavigateToSection}
              />

              {/* Sección 4 — No ficción */}
              <ExploreSection
                type="non-fiction"
                titleKey="explore.sections.nonFiction"
                onNavigate={handleNavigateToSection}
              />

              {/* Sección 5 — Nuevos lanzamientos */}
              <ExploreSection
                type="new-releases"
                titleKey="explore.sections.newReleases"
                onNavigate={handleNavigateToSection}
              />

              {/* Sección 6 — Rápidos y muy buenos */}
              <ExploreSection
                type="quick-reads"
                titleKey="explore.sections.quickReads"
                onNavigate={handleNavigateToSection}
              />
            </>
          ) : (
            <>
              {/* Sección 2 — Porque estás leyendo */}
              {shelfDerived?.referenceBook && (
                <ExploreSection
                  type="because-reading"
                  params={{
                    ...shelfParams,
                    referenceBookKey: shelfDerived.referenceBook.key,
                    referenceBookTitle: truncate(shelfDerived.referenceBook.title),
                    referenceGenre: shelfDerived.referenceBook.genre,
                  }}
                  titleKey="explore.sections.becauseReading"
                  onNavigate={handleNavigateToSection}
                />
              )}

              {/* Sección 3 — Más de [género] */}
              {shelfDerived?.favoriteGenre && (
                <ExploreSection
                  type="more-genre"
                  params={{ ...shelfParams, favoriteGenre: shelfDerived.favoriteGenre }}
                  titleKey="explore.sections.moreGenre"
                  onNavigate={handleNavigateToSection}
                />
              )}

              {/* Sección 4 — Nuevos lanzamientos para ti */}
              <ExploreSection
                type="new-releases-for-you"
                params={shelfParams}
                titleKey="explore.sections.newReleasesForYou"
                titleFallbackKey="explore.sections.newReleasesFallback"
                onNavigate={handleNavigateToSection}
              />

              {/* Sección 5 — Siguen esperando */}
              {(shelfDerived?.wantToReadBooks?.length ?? 0) > 0 && (
                <ExploreSection
                  type="waiting"
                  params={{ ...shelfParams, wantToReadBooks: shelfDerived!.wantToReadBooks }}
                  titleKey="explore.sections.waiting"
                  onNavigate={handleNavigateToSection}
                />
              )}

              {/* Sección 6 — Más de [autor] */}
              {shelfDerived?.favoriteAuthorKey && (
                <ExploreSection
                  type="more-author"
                  params={{
                    ...shelfParams,
                    favoriteAuthorKey: shelfDerived.favoriteAuthorKey,
                    favoriteAuthorName: shelfDerived.favoriteAuthorName ?? undefined,
                  }}
                  titleKey="explore.sections.moreAuthor"
                  onNavigate={handleNavigateToSection}
                />
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

export default ExplorePage;
```

- [ ] **Step 3: Reescribir ExplorePage.scss**

Reemplazar el contenido de `src/pages/explore/ExplorePage.scss`:

```scss
@use '../../styles/lib' as *;

.explore-page {
  &__search-status {
    @include container;
    padding-top: var(--space-3);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--text-sm);

    @include from($bp-md) {
      padding-top: var(--space-4);
      font-size: var(--text-md);
    }

    p { margin: 0; }
  }

  &__clear-btn {
    @include ghost-button;
    padding: var(--space-1) 14px;
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);

    @include from($bp-md) {
      padding: var(--space-1) var(--space-4);
    }
  }

  &__section {
    @include container;
    padding-top: var(--space-6);
    padding-bottom: var(--space-16);
  }

  &__search-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
    align-items: start;

    @include from($bp-md) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    @include from($bp-lg) {
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: var(--space-4);
    }
  }

  &__sections {
    @include container;
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
    padding-top: var(--space-8);
    padding-bottom: var(--space-16);

    @include from($bp-md) {
      gap: var(--space-16);
    }
  }

  &__error {
    text-align: center;
    padding: var(--space-10) var(--space-4);
    font-size: var(--text-base);
    color: var(--color-error);
  }
}
```

- [ ] **Step 4: Build check**

```bash
npm run build
```

Esperado: sin errores de tipo. Si hay errores relacionados con `ExploreSectionPage` en routes.tsx (aún no existe), comentar ese import temporalmente.

- [ ] **Step 5: Commit**

```bash
git add src/pages/explore/ExplorePage.tsx src/pages/explore/ExplorePage.scss
git commit -m "feat(explore): reescritura de ExplorePage con secciones independientes"
```

---

## Task 8: ExploreSectionPage

**Files:**
- Create: `src/pages/explore/section/ExploreSectionPage.tsx`
- Create: `src/pages/explore/section/ExploreSectionPage.scss`
- Modify: `src/routes/routes.tsx` (añadir import real)

La subpágina "Ver más". Lee `:type` y query params de la URL y muestra todos los libros de esa sección sin límite de 6.

- [ ] **Step 1: Crear ExploreSectionPage.tsx**

Crear `src/pages/explore/section/ExploreSectionPage.tsx`:

```typescript
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import { useExploreSection } from "@/hooks/useExploreSection";
import BookGridCard from "@/components/book/cards/BookGridCard";
import ExploreGridSkeleton from "@/components/explore/ExploreGridSkeleton";
import type { ExploreSectionParams, ExploreSectionType } from "@/types/ExploreTypes";
import "./ExploreSectionPage.scss";

const SECTION_TITLE_KEYS: Record<ExploreSectionType, string> = {
  "trending": "explore.sections.trending",
  "top-rated": "explore.sections.topRated",
  "fiction": "explore.sections.fiction",
  "non-fiction": "explore.sections.nonFiction",
  "new-releases": "explore.sections.newReleases",
  "quick-reads": "explore.sections.quickReads",
  "because-reading": "explore.sections.becauseReading",
  "more-genre": "explore.sections.moreGenre",
  "new-releases-for-you": "explore.sections.newReleasesForYou",
  "waiting": "explore.sections.waiting",
  "more-author": "explore.sections.moreAuthor",
};

const SECTION_FALLBACK_KEYS: Partial<Record<ExploreSectionType, string>> = {
  "trending": "explore.sections.trendingFallback",
  "new-releases-for-you": "explore.sections.newReleasesFallback",
};

export default function ExploreSectionPage() {
  const { type } = useParams<{ type: string }>();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { lang } = useCurrentLanguage();
  const navigate = useNavigate();

  const sectionType = type as ExploreSectionType;

  const params: ExploreSectionParams = {
    referenceBookKey: searchParams.get("bookKey") ?? undefined,
    referenceBookTitle: searchParams.get("bookTitle") ?? undefined,
    referenceGenre: searchParams.get("genre") ?? undefined,
    favoriteGenre: searchParams.get("genre") ?? undefined,
    favoriteAuthorKey: searchParams.get("authorKey") ?? undefined,
    favoriteAuthorName: searchParams.get("authorName") ?? undefined,
    userAuthorKeys: searchParams.get("authorKeys")?.split(",").filter(Boolean) ?? undefined,
  };

  const { books, loading, error, retry, isFallback } = useExploreSection(
    sectionType,
    params,
    lang,
    24,
  );

  const titleKey = isFallback && SECTION_FALLBACK_KEYS[sectionType]
    ? SECTION_FALLBACK_KEYS[sectionType]!
    : SECTION_TITLE_KEYS[sectionType] ?? "";

  const title = t(titleKey, {
    genre: params.favoriteGenre,
    author: params.favoriteAuthorName,
  });

  return (
    <div className="section-page">
      <div className="section-page__header">
        <button
          type="button"
          className="section-page__back"
          onClick={() => navigate(-1)}
        >
          {t("explore.backBtn")}
        </button>
        <h1 className="section-page__title">{title}</h1>
      </div>

      {loading && (
        <div className="section-page__skeleton">
          <ExploreGridSkeleton />
        </div>
      )}

      {error && (
        <div className="section-page__error">
          <p>{t("explore.sectionError")}</p>
          <button type="button" onClick={retry}>
            {t("explore.retry")}
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="section-page__grid">
          {books.map(book => (
            <BookGridCard key={book.key} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Crear ExploreSectionPage.scss**

Crear `src/pages/explore/section/ExploreSectionPage.scss`:

```scss
@use '../../../styles/lib' as *;

.section-page {
  @include container;
  padding-top: var(--space-6);
  padding-bottom: var(--space-16);
  display: flex;
  flex-direction: column;
  gap: var(--space-8);

  &__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__back {
    @include ghost-button;
    align-self: flex-start;
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-secondary);
    padding: 0;
    display: flex;
    align-items: center;
    gap: var(--space-1);

    &::before {
      content: "←";
    }

    &:hover {
      color: var(--color-text-primary);
    }
  }

  &__title {
    font-size: var(--text-2xl);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    margin: 0;

    @include from($bp-md) {
      font-size: var(--text-3xl);
    }
  }

  &__skeleton,
  &__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
    align-items: start;

    @include from($bp-md) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    @include from($bp-lg) {
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: var(--space-4);
    }
  }

  &__error {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    align-items: flex-start;
    color: var(--color-text-secondary);
    font-size: var(--text-sm);

    button {
      @include ghost-button;
      color: var(--color-brand-primary);
      font-weight: var(--weight-semibold);
      padding: 0;
    }
  }
}
```

- [ ] **Step 3: Añadir import real en routes.tsx**

En `src/routes/routes.tsx`, añadir el import de `ExploreSectionPage` y la ruta:

```typescript
import ExploreSectionPage from "@/pages/explore/section/ExploreSectionPage";

// Dentro de children:
{ path: "explore/section/:type", element: <ExploreSectionPage /> },
```

- [ ] **Step 4: Build check final**

```bash
npm run build
```

Esperado: sin errores de tipo.

- [ ] **Step 5: Commit**

```bash
git add src/pages/explore/section/ src/routes/routes.tsx
git commit -m "feat(explore): subpágina ExploreSectionPage con ruta /explore/section/:type"
```

---

## Notas de Firestore

Algunos queries pueden requerir índices compuestos. Firestore mostrará en la consola del navegador un enlace directo para crearlos. Los casos más probables:

- `getTrendingBooks`: índice en `(langs array-contains, addCount desc)` — puede que no sea necesario si Firestore lo resuelve con índice de colección.
- `getTopRatedBooks`: `(langs array-contains, rating >=)` — Firestore puede pedir índice en (`langs`, `rating`).
- `getBooksByGenre`: `(genre ==, langs array-contains)` — ya puede existir parcialmente por `getRecommendationsFromDB`.

Al ejecutar la app por primera vez, revisar la consola y crear los índices sugeridos por Firebase.

---

## Self-review contra el spec

| Requisito | Cubierto | Dónde |
|-----------|----------|-------|
| 6 secciones versión guest | Sí | Task 7 ExplorePage |
| 6 secciones versión login | Sí | Task 7 ExplorePage |
| Banner conversión entre sección 2 y 3 (guest) | Sí | Task 6 + Task 7 |
| Carga independiente por sección | Sí | cada ExploreSection monta su propio useExploreSection |
| Skeleton de 6 cards mientras carga | Sí | Task 5 ExploreGridSkeleton |
| Error inline con reintentar por sección | Sí | ExploreSection error state |
| Exactamente 6 cards por sección | Sí | count=6 por defecto en useExploreSection |
| "Ver más" navega a subpágina | Sí | Task 5 ExploreSection + Task 8 |
| Scroll restoration al volver | Sí | sessionStorage en Task 7 |
| Tendencias: fallback a populares | Sí | useExploreSection "trending" case |
| Título dinámico "Porque estás leyendo [X]" truncado a 40 chars | Sí | truncate() en Task 7, pero ver nota* |
| "Más de [Género]" con género favorito | Sí | shelfDerived.favoriteGenre |
| "Nuevos lanzamientos para ti" con fallback | Sí | useExploreSection "new-releases-for-you" |
| "Siguen esperando" omitido si lista vacía | Sí | condicional en ExplorePage |
| "Más de [Autor]" omitido si nadie cumple | Sí | condicional en ExplorePage |
| "Porque estás leyendo" omitido si sin libros | Sí | condicional en ExplorePage |
| Versión guest si registrado sin actividad | Sí | `!shelfDerived.hasBooks` en ExplorePage |
| addCount incrementa al añadir al shelf | Sí | Task 3 |
| first_publish_year >= currentYear | Sí | `year = new Date().getFullYear()` |
| Título sección "becauseReading" incluye nombre del libro | Pendiente* | |

*Nota: el título "Porque estás leyendo [X]" está en i18n como la clave `explore.sections.becauseReading` sin interpolación de variable de libro. Añadir `referenceBookTitle` como parámetro de traducción requiere que `ExploreSection` pase `referenceBookTitle` al `t()` call. En `ExploreSection.tsx`, la línea del título debe ser:
```typescript
const title = resolvedTitleKey ? t(resolvedTitleKey, {
  genre: params.favoriteGenre,
  author: params.favoriteAuthorName,
  title: params.referenceBookTitle,
}) : "";
```
Y actualizar las claves i18n:
```json
"becauseReading": "Porque estás leyendo {{title}}"
```
