# Explore Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la página Explorar con 11 secciones para usuarios con login y 5 para usuarios sin login, añadiendo nuevos tipos de sección, un componente de género en mosaico, y expandiendo el uso de `FeaturedBookCard`.

**Architecture:** Se amplían `ExploreSectionType` y los algoritmos de `buildSections` con nuevos tipos (`because-liked`, `because-finished`, `because-favorites`, `acclaimed`, `genre-grid`). `GenreSection` es un componente independiente para el mosaico A3. `ExploreSection` ya tiene soporte para `featured`. `ExplorePage` orquesta el orden y pasa los nuevos campos derivados del shelf.

**Tech Stack:** React 19, TypeScript, Firebase Firestore, react-router, react-i18next, SCSS BEM, CSS custom properties.

**Spec:** `docs/superpowers/specs/2026-05-21-explore-page-redesign.md`

**No hay test suite** — verificar con `npm run build` (type-check) tras cada tarea y `npm run dev` al final.

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Modificar | `src/types/ExploreTypes.ts` |
| Modificar | `src/plugins/i18n/locales/es/explore.json` |
| Modificar | `src/plugins/i18n/locales/en/explore.json` |
| Modificar | `src/services/firebase/firebaseBooks.ts` |
| Modificar | `src/utils/genreUtils.ts` |
| Crear | `src/components/explore/GenreSection.tsx` |
| Crear | `src/components/explore/GenreSection.scss` |
| Modificar | `src/components/explore/ExploreSection.tsx` |
| Modificar | `src/hooks/useExploreSection.ts` |
| Modificar | `src/hooks/useExploreSections.ts` |
| Modificar | `src/pages/explore/ExplorePage.tsx` |

---

## Task 1: Update ExploreTypes.ts

**Files:**
- Modify: `src/types/ExploreTypes.ts`

- [ ] **Reemplazar el contenido de `src/types/ExploreTypes.ts`:**

```ts
export type ExploreSectionType =
  | "trending"
  | "acclaimed"
  | "top-rated"
  | "because-reading"
  | "because-liked"
  | "because-finished"
  | "because-favorites"
  | "more-genre"
  | "more-author"
  | "new-releases-for-you"
  | "waiting"
  | "genre-grid"
  | "top-genre";

export type ExploreSectionParams = {
  referenceBookKey?: string;
  referenceBookTitle?: string;
  referenceGenre?: string;
  favoriteGenre?: string;
  favoriteGenreLabel?: string;
  favoriteAuthorKey?: string;
  favoriteAuthorName?: string;
  userAuthorKeys?: string[];
  userShelfKeys?: Set<string>;
  wantToReadBooks?: import("@/types/Book").Book[];
  favoritesReferenceBook?: import("@/types/Book").Book;
};

export type UseSectionResult = {
  books: import("@/types/Book").Book[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  isFallback: boolean;
};
```

- [ ] **Verificar tipos:** `npm run build` — debe compilar sin errores.

- [ ] **Commit:**
```bash
git add src/types/ExploreTypes.ts
git commit -m "feat(explore): add new ExploreSectionType values and favoritesReferenceBook param"
```

---

## Task 2: Add i18n keys

**Files:**
- Modify: `src/plugins/i18n/locales/es/explore.json`
- Modify: `src/plugins/i18n/locales/en/explore.json`

- [ ] **En `es/explore.json`, añadir dentro de `"sections"` (después de `"topGenre"`):**

```json
"acclaimed": "Aclamados por la crítica",
"becauseLiked": "Porque te gustó {{title}}",
"becauseFinished": "Porque leíste {{title}}",
"becauseFavorites": "Basado en tus favoritos",
"genreGrid": "Explorar por género"
```

- [ ] **En `en/explore.json`, añadir dentro de `"sections"` (después de `"topGenre"`):**

```json
"acclaimed": "Critically acclaimed",
"becauseLiked": "Because you liked {{title}}",
"becauseFinished": "Because you read {{title}}",
"becauseFavorites": "Based on your favorites",
"genreGrid": "Explore by genre"
```

- [ ] **Commit:**
```bash
git add src/plugins/i18n/locales/es/explore.json src/plugins/i18n/locales/en/explore.json
git commit -m "feat(explore): add i18n keys for new section types"
```

---

## Task 3: Add Firebase query functions

**Files:**
- Modify: `src/services/firebase/firebaseBooks.ts`

`getTopRatedBooks` ya existe y sirve como base para `acclaimed` — se filtrará a `>= 4.5` en el cliente dentro de `useExploreSection`. Solo hay que añadir dos funciones nuevas.

- [ ] **Añadir `getTopAuthorBooks` después de `getTopRatedBooks`:**

```ts
export async function getTopAuthorBooks(authorKey: string, lang: string, minCount = 4): Promise<Book[]> {
  const books = await getAuthorBooksFromDB(authorKey, "", lang);
  return books.length < minCount ? [] : books;
}
```

- [ ] **Añadir `getPopularAuthorWithBooks` después de `getTopAuthorBooks`:**

```ts
export async function getPopularAuthorWithBooks(
  lang: string,
): Promise<{ authorKey: string; authorName: string; books: Book[] } | null> {
  const trending = await getTrendingBooks(lang, 20);
  for (const book of trending) {
    if (!book.authorKeys?.length) continue;
    const authorKey = book.authorKeys[0];
    const authorName = book.authors[0];
    if (!authorKey || !authorName) continue;
    const books = await getTopAuthorBooks(authorKey, lang, 4);
    if (books.length >= 4) return { authorKey, authorName, books };
  }
  return null;
}
```

- [ ] **Verificar:** `npm run build` — sin errores TypeScript.

- [ ] **Commit:**
```bash
git add src/services/firebase/firebaseBooks.ts
git commit -m "feat(explore): add getAcclaimedBooks, getTopAuthorBooks, getPopularAuthorWithBooks"
```

---

## Task 4: Add genreToColorVar utility

**Files:**
- Modify: `src/utils/genreUtils.ts`

- [ ] **Añadir al final de `genreUtils.ts`:**

```ts
const GENRE_COLOR_MAP: Record<string, string> = {
  "Fiction": "var(--color-genre-fiction)",
  "Non-Fiction": "var(--color-genre-nonfiction)",
  "Mystery and detective stories": "var(--color-genre-mystery)",
  "Romance": "var(--color-genre-romance)",
  "Science Fiction": "var(--color-genre-scifi)",
  "Historical Fiction": "var(--color-genre-historical)",
  "Fantasy": "var(--color-genre-fiction)",
  "Thriller": "var(--color-genre-mystery)",
};

export function genreToColorVar(genre: string): string {
  return GENRE_COLOR_MAP[genre] ?? "var(--color-genre-default)";
}
```

- [ ] **Commit:**
```bash
git add src/utils/genreUtils.ts
git commit -m "feat(explore): add genreToColorVar utility for genre tile colors"
```

---

## Task 5: Create GenreSection component

**Files:**
- Create: `src/components/explore/GenreSection.tsx`
- Create: `src/components/explore/GenreSection.scss`

Los géneros del mosaico son una lista fija de 7. El tile héroe es el género recibido como `featuredGenre`; los demás van en los tiles pequeños.

- [ ] **Crear `src/components/explore/GenreSection.tsx`:**

```tsx
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { genreToColorVar, genreToI18nKey } from "@/utils/genreUtils";
import "./GenreSection.scss";

export const EXPLORE_GENRES = [
  "Fiction",
  "Non-Fiction",
  "Mystery and detective stories",
  "Romance",
  "Science Fiction",
  "Historical Fiction",
];

type Props = {
  featuredGenre: string;
};

export default function GenreSection({ featuredGenre }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const otherGenres = EXPLORE_GENRES.filter(g => g !== featuredGenre);
  const allGenres = "all";

  const handleClick = (genre: string) => {
    navigate(`/explore/section/more-genre?genre=${encodeURIComponent(genre)}`);
  };

  const handleAllClick = () => {
    navigate("/explore/section/more-genre");
  };

  return (
    <section className="genre-section">
      <div className="genre-section__header">
        <h2 className="genre-section__title">{t("explore.sections.genreGrid")}</h2>
      </div>
      <div className="genre-section__grid">
        <button
          type="button"
          className="genre-section__tile genre-section__tile--hero"
          style={{ background: genreToColorVar(featuredGenre) }}
          onClick={() => handleClick(featuredGenre)}
        >
          <span className="genre-section__tile-label-small">{t("explore.sections.featured", { defaultValue: "destacado" })}</span>
          <span className="genre-section__tile-title">
            {t(`book.genres.${genreToI18nKey(featuredGenre)}`, { defaultValue: featuredGenre })}
          </span>
        </button>

        {otherGenres.slice(0, 5).map(genre => (
          <button
            key={genre}
            type="button"
            className="genre-section__tile"
            style={{ background: genreToColorVar(genre) }}
            onClick={() => handleClick(genre)}
          >
            <span className="genre-section__tile-name">
              {t(`book.genres.${genreToI18nKey(genre)}`, { defaultValue: genre })}
            </span>
          </button>
        ))}

        <button
          type="button"
          className="genre-section__tile genre-section__tile--all"
          onClick={handleAllClick}
        >
          <span className="genre-section__tile-name">
            {t("explore.allGenres", { defaultValue: "Todos los géneros" })}
          </span>
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Crear `src/components/explore/GenreSection.scss`:**

```scss
@use '../../styles/lib' as *;

.genre-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  &__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  &__title {
    font-size: var(--text-xl);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: 0;

    @include from($bp-md) {
      font-size: var(--text-2xl);
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(4, 120px);
    gap: var(--space-3);

    @include from($bp-md) {
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(2, 130px);
    }
  }

  &__tile {
    border: none;
    border-radius: var(--radius-lg);
    cursor: pointer;
    padding: var(--space-4);
    display: flex;
    align-items: flex-end;
    box-shadow: var(--shadow-card);
    transition: transform var(--transition-base), box-shadow var(--transition-base);
    text-align: left;

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-card-hover);
    }

    &--hero {
      grid-column: span 2;
      grid-row: span 2;
      flex-direction: column;
      justify-content: space-between;
      align-items: flex-start;
      padding: var(--space-6);
    }

    &--all {
      background: var(--color-genre-default);
    }
  }

  &__tile-label-small {
    font-family: var(--font-main);
    font-size: 11px;
    font-weight: var(--weight-medium);
    color: rgba(255, 255, 255, 0.8);
    text-transform: lowercase;
    letter-spacing: 0.03em;
  }

  &__tile-title {
    font-family: var(--font-editorial);
    font-style: italic;
    font-size: var(--text-3xl);
    font-weight: var(--weight-bold);
    color: var(--color-text-on-dark);
    line-height: 1.05;
  }

  &__tile-name {
    font-family: var(--font-main);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-on-dark);

    .genre-section__tile--all & {
      color: var(--color-text-primary);
    }
  }
}
```

- [ ] **Añadir clave i18n `explore.allGenres`** en `es/explore.json` y `en/explore.json`:

En `es/explore.json`, añadir al nivel de `"sections"` (mismo nivel que `"banner"`):
```json
"allGenres": "Todos los géneros"
```

En `en/explore.json`:
```json
"allGenres": "All genres"
```

- [ ] **Verificar:** `npm run build` — sin errores.

- [ ] **Commit:**
```bash
git add src/components/explore/GenreSection.tsx src/components/explore/GenreSection.scss src/plugins/i18n/locales/es/explore.json src/plugins/i18n/locales/en/explore.json
git commit -m "feat(explore): create GenreSection component with A3 mosaic layout"
```

---

## Task 6: Update useExploreSection for new types + fix count

**Files:**
- Modify: `src/hooks/useExploreSection.ts`
- Modify: `src/components/explore/ExploreSection.tsx`

- [ ] **En `useExploreSection.ts`, añadir el import de las nuevas funciones** (línea 5, dentro del bloque de imports de `firebaseBooks`):

```ts
import {
  getAcclaimedBooks,
  getAuthorBooksFromDB,
  getAuthorNewReleases,
  getBooksByGenre,
  getGenreNewReleases,
  getNewReleaseBooks,
  getRecommendationsByGenre,
  getTopRatedBooks,
  getTrendingBooks,
} from "@/services/firebase/firebaseBooks";
```

- [ ] **En el `switch` de `fetchSection`, añadir los nuevos casos** (antes del `default`):

```ts
case "acclaimed": {
  const raw = await getTopRatedBooks(lang, count + 20);
  const books = raw.filter(b => (b.rating ?? 0) >= 4.5).slice(0, count);
  return { books, isFallback: false };
}

case "because-liked": {
  if (!params.referenceBookKey || !params.referenceGenre) return { books: [], isFallback: false };
  const raw = await getRecommendationsByGenre(params.referenceGenre, lang, params.referenceBookKey, count + 10);
  const books = raw
    .filter(b => (b.rating ?? 0) >= 4)
    .filter(b => !params.userShelfKeys?.has(b.key))
    .slice(0, count);
  return { books, isFallback: false };
}

case "because-finished": {
  if (!params.referenceBookKey || !params.referenceGenre) return { books: [], isFallback: false };
  const raw = await getRecommendationsByGenre(params.referenceGenre, lang, params.referenceBookKey, count + 10);
  const books = raw
    .filter(b => (b.rating ?? 0) >= 4)
    .filter(b => !params.userShelfKeys?.has(b.key))
    .slice(0, count);
  return { books, isFallback: false };
}

case "because-favorites": {
  const ref = params.favoritesReferenceBook;
  if (!ref?.genre) return { books: [], isFallback: false };
  const raw = await getRecommendationsByGenre(ref.genre, lang, ref.key, count + 10);
  const books = raw
    .filter(b => (b.rating ?? 0) >= 4)
    .filter(b => !params.userShelfKeys?.has(b.key))
    .slice(0, count);
  return { books, isFallback: false };
}

case "genre-grid":
  return { books: [], isFallback: false };
```

- [ ] **En `ExploreSection.tsx`, cambiar el `count` hardcodeado** (línea 64) para usar 4 cuando `featured`:

```ts
const result = useExploreSection(type, params, lang, featured ? 4 : 6, !!override);
```

- [ ] **Verificar:** `npm run build` — sin errores.

- [ ] **Commit:**
```bash
git add src/hooks/useExploreSection.ts src/components/explore/ExploreSection.tsx
git commit -m "feat(explore): add acclaimed, because-liked, because-finished, because-favorites to useExploreSection"
```

---

## Task 7: Update shelfDerived + favorites fetch in ExplorePage

**Files:**
- Modify: `src/pages/explore/ExplorePage.tsx`

Se añaden cuatro campos a `ShelfDerived` y un `useEffect` separado para cargar los favoritos.

- [ ] **Actualizar el tipo `ShelfDerived`** (líneas 23–33). Añadir los cuatro campos nuevos:

```ts
type ShelfDerived = {
  userShelfKeys: Set<string>;
  userAuthorKeys: string[];
  referenceBooks: import("@/types/Book").Book[];
  favoriteGenre: string | null;
  favoriteGenreLabel: string | null;
  favoriteAuthorKey: string | null;
  favoriteAuthorName: string | null;
  fiveStarAuthorKey: string | null;
  fiveStarAuthorName: string | null;
  likedBook: import("@/types/Book").Book | null;
  finishedBook: import("@/types/Book").Book | null;
  wantToReadBooks: import("@/types/Book").Book[];
  hasBooks: boolean;
};
```

- [ ] **Añadir import de `getFavorites`** al bloque de imports de servicios de firebase:

```ts
import { getFavorites } from "@/services/firebase/firebaseUsers";
```

- [ ] **Añadir import de `Book`** si no está ya presente:

```ts
import type { Book } from "@/types/Book";
```

- [ ] **Añadir estado para el libro de referencia de favoritos** después de `const [searchQuery, setSearchQuery] = useState("")`:

```ts
const { user } = useAuth();
const [favoritesReferenceBook, setFavoritesReferenceBook] = useState<Book | null>(null);
```

- [ ] **Añadir `useEffect` para cargar favoritos** después del `useEffect` de scroll:

```ts
useEffect(() => {
  if (!isLoggedIn || !user) return;
  let cancelled = false;
  getFavorites(user.uid).then(async favs => {
    if (cancelled || favs.length === 0) return;
    const { getBookFromDB } = await import("@/services/firebase/firebaseBooks");
    for (const fav of favs) {
      const book = await getBookFromDB(fav.key, lang);
      if (cancelled) return;
      if (book?.genre) {
        setFavoritesReferenceBook(book);
        return;
      }
    }
  });
  return () => { cancelled = true; };
}, [isLoggedIn, user?.uid, lang]);
```

- [ ] **Actualizar el cálculo de `shelfDerived`** dentro del `useMemo`. Cambios respecto al actual:

1. `favoriteGenre` ahora incluye `wantToRead`:
```ts
const genreCounts: Record<string, number> = {};
for (const b of [...shelfByStatus.finished, ...shelfByStatus.reading, ...shelfByStatus.wantToRead]) {
  if (b.genre) genreCounts[b.genre] = (genreCounts[b.genre] ?? 0) + 1;
}
```

2. Añadir cálculo de `fiveStarAuthorKey/Name`:
```ts
const fiveStarBook = [...shelfByStatus.finished, ...shelfByStatus.reading]
  .find(b => (b.rating ?? 0) === 5 && b.authorKeys?.length) ?? null;
const fiveStarAuthorKey = fiveStarBook?.authorKeys?.[0] ?? null;
const fiveStarAuthorName = fiveStarBook?.authors?.[0] ?? null;
```

3. Añadir cálculo de `likedBook` y `finishedBook`:
```ts
const likedBook = [...shelfByStatus.finished, ...shelfByStatus.reading]
  .find(b => (b.rating ?? 0) >= 4 && b.genre) ?? null;

const finishedBook = shelfByStatus.finished.find(b => b.genre) ?? null;
```

4. Actualizar el `return` del `useMemo` con los nuevos campos:
```ts
return {
  userShelfKeys,
  referenceBooks,
  favoriteGenre,
  favoriteGenreLabel,
  favoriteAuthorKey: favoriteAuthor?.[0] ?? null,
  favoriteAuthorName: favoriteAuthor?.[1].name ?? null,
  fiveStarAuthorKey,
  fiveStarAuthorName,
  likedBook,
  finishedBook,
  userAuthorKeys,
  wantToReadBooks: shelfByStatus.wantToRead,
  hasBooks: allBooks.length > 0,
};
```

- [ ] **Verificar:** `npm run build` — sin errores.

- [ ] **Commit:**
```bash
git add src/pages/explore/ExplorePage.tsx
git commit -m "feat(explore): add fiveStarAuthor, likedBook, finishedBook to shelfDerived; fetch favoritesReferenceBook"
```

---

## Task 8: Rewrite buildSections in useExploreSections

**Files:**
- Modify: `src/hooks/useExploreSections.ts`

- [ ] **Actualizar `ExploreSectionsParams`** para añadir los nuevos campos (líneas 29–39):

```ts
export type ExploreSectionsParams = {
  lang: string;
  userShelfKeys: Set<string>;
  userAuthorKeys: string[];
  favoriteGenre: string | null;
  favoriteGenreLabel: string | null;
  favoriteAuthorKey: string | null;
  favoriteAuthorName: string | null;
  fiveStarAuthorKey: string | null;
  fiveStarAuthorName: string | null;
  referenceBooks: Book[];
  wantToReadBooks: Book[];
  likedBook: Book | null;
  finishedBook: Book | null;
  favoritesReferenceBook: Book | null;
};
```

- [ ] **Actualizar los imports** para añadir `getTopAuthorBooks` y `getPopularAuthorWithBooks`:

```ts
import {
  getAuthorBooksFromDB,
  getAuthorNewReleases,
  getBooksByGenre,
  getGenreNewReleases,
  getNewReleaseBooks,
  getPopularAuthorWithBooks,
  getRecommendationsByGenre,
  getTopAuthorBooks,
  getTopRatedBooks,
  getTrendingBooks,
} from "@/services/firebase/firebaseBooks";
```

- [ ] **Definir helper `FEATURED_COUNT` y `STANDARD_COUNT`** justo antes de `buildSections`:

```ts
const FEATURED_COUNT = 4;
const STANDARD_COUNT = 6;
```

- [ ] **Reemplazar la función `buildSections` completa:**

```ts
async function buildSections(params: ExploreSectionsParams): Promise<SectionEntry[]> {
  const {
    lang, userShelfKeys, userAuthorKeys,
    favoriteGenre, favoriteGenreLabel,
    favoriteAuthorKey, favoriteAuthorName,
    fiveStarAuthorKey, fiveStarAuthorName,
    referenceBooks, wantToReadBooks,
    likedBook, finishedBook, favoritesReferenceBook,
  } = params;

  const year = new Date().getFullYear();
  const seenKeys = new Set<string>(userShelfKeys);
  const entries: SectionEntry[] = [];

  function claim(books: Book[]): Book[] {
    books.forEach(b => seenKeys.add(b.key));
    return books;
  }

  // 1. Trending
  const trendingRaw = await getTrendingBooks(lang, FEATURED_COUNT + 10);
  const trendingBooks = trendingRaw.filter(b => !seenKeys.has(b.key)).slice(0, FEATURED_COUNT);
  if (trendingBooks.length > 0) {
    entries.push({ id: "trending", type: "trending", books: claim(trendingBooks), isFallback: false });
  } else {
    const fallbackRaw = await getTopRatedBooks(lang, FEATURED_COUNT + 10);
    const fallback = fallbackRaw.filter(b => !seenKeys.has(b.key)).slice(0, FEATURED_COUNT);
    entries.push({ id: "trending", type: "trending", books: claim(fallback), isFallback: true });
  }

  // 2. Because-liked
  if (likedBook?.genre) {
    const raw = await getRecommendationsByGenre(likedBook.genre, lang, likedBook.key, FEATURED_COUNT + 10);
    const books = raw.filter(b => (b.rating ?? 0) >= 4 && !seenKeys.has(b.key)).slice(0, FEATURED_COUNT);
    if (books.length > 0) {
      entries.push({
        id: "because-liked",
        type: "because-liked",
        books: claim(books),
        isFallback: false,
        referenceBookKey: likedBook.key,
        referenceBookTitle: likedBook.title,
        referenceGenre: likedBook.genre,
      });
    }
  }

  // 3. Because-favorites
  if (favoritesReferenceBook?.genre) {
    const raw = await getRecommendationsByGenre(
      favoritesReferenceBook.genre, lang, favoritesReferenceBook.key, STANDARD_COUNT + 10,
    );
    const books = raw.filter(b => (b.rating ?? 0) >= 4 && !seenKeys.has(b.key)).slice(0, STANDARD_COUNT);
    if (books.length > 0) {
      entries.push({
        id: "because-favorites",
        type: "because-favorites",
        books: claim(books),
        isFallback: false,
        referenceBookKey: favoritesReferenceBook.key,
        referenceBookTitle: favoritesReferenceBook.title,
        referenceGenre: favoritesReferenceBook.genre,
      });
    }
  }

  // 4. Genre-grid (sin libros — renderizado especial en ExplorePage)
  entries.push({ id: "genre-grid", type: "genre-grid", books: [], isFallback: false });

  // 5. Acclaimed (top-rated con filtro >= 4.5 en cliente)
  const acclaimedRaw = await getTopRatedBooks(lang, FEATURED_COUNT + 20);
  const acclaimedBooks = acclaimedRaw
    .filter(b => (b.rating ?? 0) >= 4.5 && !seenKeys.has(b.key))
    .slice(0, FEATURED_COUNT);
  if (acclaimedBooks.length > 0) {
    entries.push({ id: "acclaimed", type: "acclaimed", books: claim(acclaimedBooks), isFallback: false });
  }

  // 6. More-genre
  if (favoriteGenre) {
    const raw = await getBooksByGenre(favoriteGenre, lang, STANDARD_COUNT + 20);
    const books = raw.filter(b => !seenKeys.has(b.key)).slice(0, STANDARD_COUNT);
    if (books.length > 0) {
      entries.push({
        id: "more-genre",
        type: "more-genre",
        books: claim(books),
        isFallback: false,
        favoriteGenre,
        favoriteGenreLabel: favoriteGenreLabel ?? undefined,
      });
    }
  }

  // 7. Because-finished
  if (finishedBook?.genre) {
    const raw = await getRecommendationsByGenre(finishedBook.genre, lang, finishedBook.key, FEATURED_COUNT + 10);
    const books = raw.filter(b => (b.rating ?? 0) >= 4 && !seenKeys.has(b.key)).slice(0, FEATURED_COUNT);
    if (books.length > 0) {
      entries.push({
        id: "because-finished",
        type: "because-finished",
        books: claim(books),
        isFallback: false,
        referenceBookKey: finishedBook.key,
        referenceBookTitle: finishedBook.title,
        referenceGenre: finishedBook.genre,
      });
    }
  }

  // 8. More-author (5★ primary, 2+ books fallback)
  const resolvedAuthorKey = fiveStarAuthorKey ?? favoriteAuthorKey;
  const resolvedAuthorName = fiveStarAuthorName ?? favoriteAuthorName;
  if (resolvedAuthorKey) {
    const books = (await getTopAuthorBooks(resolvedAuthorKey, lang, 4))
      .filter(b => !seenKeys.has(b.key))
      .slice(0, STANDARD_COUNT);
    if (books.length > 0) {
      entries.push({
        id: "more-author",
        type: "more-author",
        books: claim(books),
        isFallback: false,
        favoriteAuthorKey: resolvedAuthorKey,
        favoriteAuthorName: resolvedAuthorName ?? undefined,
      });
    }
  }

  // 9. Because-reading (libros leyendo actualmente)
  for (let i = 0; i < referenceBooks.length && i < 3; i++) {
    const book = referenceBooks[i];
    if (!book.genre) continue;
    const raw = await getRecommendationsByGenre(book.genre, lang, book.key, STANDARD_COUNT + 20);
    const books = raw.filter(b => (b.rating ?? 0) >= 4 && !seenKeys.has(b.key)).slice(0, STANDARD_COUNT);
    if (books.length === 0) continue;
    entries.push({
      id: `because-reading-${i}`,
      type: "because-reading",
      books: claim(books),
      isFallback: false,
      referenceBookKey: book.key,
      referenceBookTitle: book.title,
      referenceGenre: book.genre,
    });
  }

  // 10. Waiting (libros en quiero leer)
  if (wantToReadBooks.length > 0) {
    entries.push({
      id: "waiting",
      type: "waiting",
      books: wantToReadBooks.slice(0, STANDARD_COUNT),
      isFallback: false,
    });
  }

  // 11. New-releases-for-you
  const [byAuthor, byGenre] = await Promise.all([
    userAuthorKeys.length
      ? getAuthorNewReleases(userAuthorKeys, year, lang, FEATURED_COUNT + 10)
      : Promise.resolve([] as Book[]),
    favoriteGenre
      ? getGenreNewReleases(favoriteGenre, year, lang, FEATURED_COUNT + 10)
      : Promise.resolve([] as Book[]),
  ]);
  const innerSeen = new Set<string>(seenKeys);
  const merged: Book[] = [];
  for (const b of [...byAuthor, ...byGenre]) {
    if (!innerSeen.has(b.key)) { innerSeen.add(b.key); merged.push(b); }
  }
  merged.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const newReleasesBooks = merged.slice(0, FEATURED_COUNT);
  if (newReleasesBooks.length > 0) {
    entries.push({ id: "new-releases-for-you", type: "new-releases-for-you", books: claim(newReleasesBooks), isFallback: false });
  } else {
    const fallbackRaw = await getNewReleaseBooks(year, lang, FEATURED_COUNT + 10);
    const fallback = fallbackRaw.filter(b => !seenKeys.has(b.key)).slice(0, FEATURED_COUNT);
    if (fallback.length > 0) {
      entries.push({ id: "new-releases-for-you", type: "new-releases-for-you", books: claim(fallback), isFallback: true });
    }
  }

  return entries;
}
```

- [ ] **Actualizar el `useCallback` deps** en `useExploreSections` (las deps del `useCallback` deben incluir los nuevos campos):

```ts
const fetch = useCallback(async () => {
  // ... (sin cambios en el cuerpo)
}, [
  params.lang,
  params.userShelfKeys.size,
  params.userAuthorKeys.join(","),
  params.favoriteGenre,
  params.favoriteAuthorKey,
  params.fiveStarAuthorKey,
  params.referenceBooks.map(b => b.key).join(","),
  params.wantToReadBooks.length,
  params.likedBook?.key,
  params.finishedBook?.key,
  params.favoritesReferenceBook?.key,
  disabled,
]);
```

- [ ] **Verificar:** `npm run build` — sin errores.

- [ ] **Commit:**
```bash
git add src/hooks/useExploreSections.ts
git commit -m "feat(explore): rewrite buildSections with 11-section order and new recommendation algorithms"
```

---

## Task 9: Wire ExplorePage

**Files:**
- Modify: `src/pages/explore/ExplorePage.tsx`

Esta tarea conecta todo lo anterior: pasa los nuevos campos a `useExploreSections`, renderiza `GenreSection` para el tipo `genre-grid`, y actualiza la vista guest.

- [ ] **Añadir import de `GenreSection`** al bloque de imports:

```ts
import GenreSection from "@/components/explore/GenreSection";
```

- [ ] **Definir helper `FEATURED_SECTION_TYPES`** justo antes del componente `ExplorePage`:

```ts
const FEATURED_SECTION_TYPES = new Set<import("@/types/ExploreTypes").ExploreSectionType>([
  "because-liked",
  "because-finished",
  "acclaimed",
  "new-releases-for-you",
]);
```

- [ ] **Actualizar `titleKeyForEntry`** para incluir los nuevos tipos:

```ts
function titleKeyForEntry(entry: SectionEntry): string {
  const map: Partial<Record<ExploreSectionType, string>> = {
    "trending": "explore.sections.trending",
    "because-reading": "explore.sections.becauseReading",
    "because-liked": "explore.sections.becauseLiked",
    "because-finished": "explore.sections.becauseFinished",
    "because-favorites": "explore.sections.becauseFavorites",
    "acclaimed": "explore.sections.acclaimed",
    "more-genre": "explore.sections.moreGenre",
    "top-genre": "explore.sections.topGenre",
    "new-releases-for-you": "explore.sections.newReleasesForYou",
    "waiting": "explore.sections.waiting",
    "more-author": "explore.sections.moreAuthor",
  };
  return map[entry.type] ?? "explore.sections.trending";
}
```

- [ ] **Actualizar la llamada a `useExploreSections`** para pasar los nuevos campos:

```ts
const sectionsResult = useExploreSections(
  isLoggedIn && shelfDerived?.hasBooks
    ? {
        lang,
        userShelfKeys: shelfDerived.userShelfKeys,
        userAuthorKeys: shelfDerived.userAuthorKeys,
        favoriteGenre: shelfDerived.favoriteGenre,
        favoriteGenreLabel: shelfDerived.favoriteGenreLabel,
        favoriteAuthorKey: shelfDerived.favoriteAuthorKey,
        favoriteAuthorName: shelfDerived.favoriteAuthorName,
        fiveStarAuthorKey: shelfDerived.fiveStarAuthorKey,
        fiveStarAuthorName: shelfDerived.fiveStarAuthorName,
        referenceBooks: shelfDerived.referenceBooks,
        wantToReadBooks: shelfDerived.wantToReadBooks,
        likedBook: shelfDerived.likedBook,
        finishedBook: shelfDerived.finishedBook,
        favoritesReferenceBook,
      }
    : {
        lang, userShelfKeys: new Set(), userAuthorKeys: [],
        favoriteGenre: null, favoriteGenreLabel: null,
        favoriteAuthorKey: null, favoriteAuthorName: null,
        fiveStarAuthorKey: null, fiveStarAuthorName: null,
        referenceBooks: [], wantToReadBooks: [],
        likedBook: null, finishedBook: null, favoritesReferenceBook: null,
      },
  !(isLoggedIn && shelfDerived?.hasBooks)
);
```

- [ ] **Actualizar el render de secciones con login** para manejar `genre-grid` y `featured`. Reemplazar el bloque `sectionsResult.sections.map(...)`:

```tsx
{sectionsResult.sections.map((entry, index) => (
  <Fragment key={entry.id}>
    {sectionsResult.sections.length > 1 && index === Math.floor(sectionsResult.sections.length / 2) && (
      <div className="explore-page__break" aria-hidden="true" />
    )}
    {entry.type === "trending" ? (
      <TrendingSection
        books={entry.books}
        isFallback={entry.isFallback}
        params={buildParamsForEntry(entry, shelfDerived!)}
        onNavigate={handleNavigateToSection}
      />
    ) : entry.type === "genre-grid" ? (
      <GenreSection
        featuredGenre={shelfDerived?.favoriteGenre ?? "Fiction"}
      />
    ) : (
      <ExploreSection
        type={entry.type}
        override={{ books: entry.books, isFallback: entry.isFallback }}
        params={buildParamsForEntry(entry, shelfDerived!)}
        titleKey={titleKeyForEntry(entry)}
        titleFallbackKey={entry.type === "new-releases-for-you" ? "explore.sections.newReleasesFallback" : undefined}
        titleHighlight={titleHighlightForEntry(entry)}
        featured={FEATURED_SECTION_TYPES.has(entry.type)}
        onNavigate={handleNavigateToSection}
      />
    )}
  </Fragment>
))}
```

- [ ] **Actualizar la vista guest** (reemplazar las secciones `showGuestVersion` del segundo bloque):

```tsx
{showGuestVersion && (
  <>
    <ExploreSection
      type="acclaimed"
      titleKey="explore.sections.acclaimed"
      featured
      onNavigate={handleNavigateToSection}
    />

    <div className="explore-page__break" aria-hidden="true" />

    {isGuest && <ExploreConversionBanner />}

    <GenreSection
      featuredGenre="Fiction"
    />

    <ExploreSection
      type="more-author"
      titleKey="explore.sections.moreAuthor"
      onNavigate={handleNavigateToSection}
    />
  </>
)}
```

> Nota: la sección `more-author` en guest requiere que `getPopularAuthorWithBooks` se llame desde `useExploreSection`. Para el tipo `more-author` sin `params.favoriteAuthorKey`, el hook devuelve vacío. Añadir un caso en `useExploreSection` que, si `favoriteAuthorKey` es null, llame a `getPopularAuthorWithBooks`:

```ts
case "more-author": {
  if (params.favoriteAuthorKey) {
    const raw = await getAuthorBooksFromDB(params.favoriteAuthorKey, "", lang);
    const books = raw.filter(b => !params.userShelfKeys?.has(b.key)).slice(0, count);
    return { books, isFallback: false };
  }
  // Guest: usar autor popular
  const popular = await getPopularAuthorWithBooks(lang);
  if (!popular) return { books: [], isFallback: false };
  return { books: popular.books.slice(0, count), isFallback: false };
}
```

Actualizar el import en `useExploreSection.ts` para incluir `getPopularAuthorWithBooks` si no está ya.

- [ ] **Verificar:** `npm run build` — sin errores TypeScript.

- [ ] **Probar manualmente:** `npm run dev`
  - Con cuenta con libros: verificar que aparecen las 11 secciones en el orden correcto.
  - Con cuenta sin libros / guest: verificar Trending → Acclaimed → Banner (si guest) → GenreSection → Author.
  - Click en tile de género: navega a `/explore/section/more-genre?genre=Fiction`.
  - Las secciones featured (becauseLiked, acclaimed, becauseFinished, newReleasesForYou) muestran FeaturedBookCard + 3 BookCard.

- [ ] **Commit:**
```bash
git add src/pages/explore/ExplorePage.tsx src/hooks/useExploreSection.ts
git commit -m "feat(explore): wire ExplorePage with new section order, GenreSection, and featured layouts"
```
