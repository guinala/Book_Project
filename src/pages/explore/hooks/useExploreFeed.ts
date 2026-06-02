import type { Book } from "@/types/Book";
import type { ExploreSectionType } from "@/types/ExploreTypes";
import {
  getAuthorNewReleases,
  getBooksByGenre,
  getGenreNewReleases,
  getNewReleaseBooks,
  getRecommendationsByGenre,
  getTopAuthorBooks,
  getTopRatedBooks,
  getTrendingBooks,
} from "@/services/firebase/firebaseBooks";
import { useAuth } from "@/context/auth/useAuth";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export type SectionEntry = {
  id: string;
  type: ExploreSectionType;
  books: Book[];
  isFallback: boolean;
  referenceBookKey?: string;
  referenceBookTitle?: string;
  referenceGenre?: string;
  favoriteGenre?: string;
  favoriteGenreLabel?: string;
  favoriteAuthorKey?: string;
  favoriteAuthorName?: string;
};

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

export type ExploreSectionsResult = {
  sections: SectionEntry[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

const FETCH_LIMIT = 40;
const ABOVE_FOLD = 6;

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
}

async function buildSections(
  params: ExploreSectionsParams,
  signal?: AbortSignal,
): Promise<SectionEntry[]> {
  const {
    lang, userShelfKeys, userAuthorKeys,
    favoriteGenre, favoriteGenreLabel,
    favoriteAuthorKey, favoriteAuthorName,
    fiveStarAuthorKey, fiveStarAuthorName,
    referenceBooks, wantToReadBooks,
    likedBook, finishedBook, favoritesReferenceBook,
  } = params;

  const year = new Date().getFullYear();
  const entries: SectionEntry[] = [];

  // Tracks keys of books occupying the first ABOVE_FOLD slots in already-built sections.
  const globalVisibleKeys = new Set<string>();

  function offShelf(books: Book[]): Book[] {
    return books.filter(b => !userShelfKeys.has(b.key));
  }

  function surfaceFresh(books: Book[]): Book[] {
    const fresh = books.filter(b => !globalVisibleKeys.has(b.key));
    const repeated = books.filter(b => globalVisibleKeys.has(b.key));
    const reordered = [...fresh, ...repeated];
    reordered.slice(0, ABOVE_FOLD).forEach(b => globalVisibleKeys.add(b.key));
    return reordered;
  }

  // 1. Trending
  const trendingBooks = await getTrendingBooks(lang, FETCH_LIMIT, signal);
  if (trendingBooks.length > 0) {
    trendingBooks.slice(0, ABOVE_FOLD).forEach(b => globalVisibleKeys.add(b.key));
    entries.push({ id: "trending", type: "trending", books: trendingBooks, isFallback: false });
  } else {
    const fallback = await getTopRatedBooks(lang, FETCH_LIMIT, signal);
    fallback.slice(0, ABOVE_FOLD).forEach(b => globalVisibleKeys.add(b.key));
    entries.push({ id: "trending", type: "trending", books: fallback, isFallback: true });
  }

  const usedReferenceKeys = new Set<string>();

  // 2. Because-liked
  if (likedBook?.genre && !usedReferenceKeys.has(likedBook.key)) {
    const raw = offShelf(
      await getRecommendationsByGenre(likedBook.genre, lang, likedBook.key, FETCH_LIMIT, signal),
    ).filter(b => (b.rating ?? 0) >= 4);
    const books = surfaceFresh(raw);
    if (books.length > 0) {
      usedReferenceKeys.add(likedBook.key);
      entries.push({
        id: "because-liked",
        type: "because-liked",
        books,
        isFallback: false,
        referenceBookKey: likedBook.key,
        referenceBookTitle: likedBook.title,
        referenceGenre: likedBook.genre,
      });
    }
  }

  // 3. Because-favorites
  if (favoritesReferenceBook?.genre && !usedReferenceKeys.has(favoritesReferenceBook.key)) {
    const raw = offShelf(
      await getRecommendationsByGenre(favoritesReferenceBook.genre, lang, favoritesReferenceBook.key, FETCH_LIMIT, signal),
    ).filter(b => (b.rating ?? 0) >= 4);
    const books = surfaceFresh(raw);
    if (books.length > 0) {
      usedReferenceKeys.add(favoritesReferenceBook.key);
      entries.push({
        id: "because-favorites",
        type: "because-favorites",
        books,
        isFallback: false,
        referenceBookKey: favoritesReferenceBook.key,
        referenceBookTitle: favoritesReferenceBook.title,
        referenceGenre: favoritesReferenceBook.genre,
      });
    }
  }

  // 4. Genre-grid (no books — special render in ExplorePage)
  entries.push({ id: "genre-grid", type: "genre-grid", books: [], isFallback: false });

  // 5. Because-finished
  if (finishedBook?.genre && !usedReferenceKeys.has(finishedBook.key)) {
    const raw = offShelf(
      await getRecommendationsByGenre(finishedBook.genre, lang, finishedBook.key, FETCH_LIMIT, signal),
    ).filter(b => (b.rating ?? 0) >= 4);
    const books = surfaceFresh(raw);
    if (books.length > 0) {
      usedReferenceKeys.add(finishedBook.key);
      entries.push({
        id: "because-finished",
        type: "because-finished",
        books,
        isFallback: false,
        referenceBookKey: finishedBook.key,
        referenceBookTitle: finishedBook.title,
        referenceGenre: finishedBook.genre,
      });
    }
  }

  // 6. More-author (5★ primary, fallback to favoriteAuthorKey)
  const resolvedAuthorKey = fiveStarAuthorKey ?? favoriteAuthorKey;
  const resolvedAuthorName = fiveStarAuthorName ?? favoriteAuthorName;
  if (resolvedAuthorKey) {
    const raw = offShelf(await getTopAuthorBooks(resolvedAuthorKey, lang, 4, signal));
    const books = surfaceFresh(raw);
    if (books.length > 0) {
      entries.push({
        id: "more-author",
        type: "more-author",
        books,
        isFallback: false,
        favoriteAuthorKey: resolvedAuthorKey,
        favoriteAuthorName: resolvedAuthorName ?? undefined,
      });
    }
  }

  // 7. More-genre
  if (favoriteGenre) {
    const raw = offShelf(await getBooksByGenre(favoriteGenre, lang, FETCH_LIMIT, signal));
    const books = surfaceFresh(raw);
    if (books.length > 0) {
      entries.push({
        id: "more-genre",
        type: "more-genre",
        books,
        isFallback: false,
        favoriteGenre,
        favoriteGenreLabel: favoriteGenreLabel ?? undefined,
      });
    }
  }

  // 8. Because-reading
  for (let i = 0; i < referenceBooks.length && i < 3; i++) {
    const book = referenceBooks[i];
    if (!book.genre || usedReferenceKeys.has(book.key)) continue;
    const raw = offShelf(
      await getRecommendationsByGenre(book.genre, lang, book.key, FETCH_LIMIT, signal),
    ).filter(b => (b.rating ?? 0) >= 4);
    if (raw.length === 0) continue;
    usedReferenceKeys.add(book.key);
    entries.push({
      id: `because-reading-${i}`,
      type: "because-reading",
      books: surfaceFresh(raw),
      isFallback: false,
      referenceBookKey: book.key,
      referenceBookTitle: book.title,
      referenceGenre: book.genre,
    });
  }

  // 9. New-releases-for-you
  const [byAuthor, byGenre] = await Promise.all([
    userAuthorKeys.length
      ? getAuthorNewReleases(userAuthorKeys, year, lang, FETCH_LIMIT, signal)
      : Promise.resolve([] as Book[]),
    favoriteGenre
      ? getGenreNewReleases(favoriteGenre, year, lang, FETCH_LIMIT, signal)
      : Promise.resolve([] as Book[]),
  ]);
  throwIfAborted(signal);
  const innerSeen = new Set<string>();
  const merged: Book[] = [];
  for (const b of offShelf([...byAuthor, ...byGenre])) {
    if (!innerSeen.has(b.key)) { innerSeen.add(b.key); merged.push(b); }
  }
  merged.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  if (merged.length > 0) {
    entries.push({ id: "new-releases-for-you", type: "new-releases-for-you", books: surfaceFresh(merged), isFallback: false });
  } else {
    const fallback = offShelf(await getNewReleaseBooks(year, lang, FETCH_LIMIT, signal));
    if (fallback.length > 0) {
      entries.push({ id: "new-releases-for-you", type: "new-releases-for-you", books: surfaceFresh(fallback), isFallback: true });
    }
  }

  // 10. Waiting
  if (wantToReadBooks.length > 0) {
    entries.push({
      id: "waiting",
      type: "waiting",
      books: wantToReadBooks,
      isFallback: false,
    });
  }

  return entries;
}

export function useExploreFeed(params: ExploreSectionsParams, disabled = false): ExploreSectionsResult {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const query = useQuery({
    queryKey: ["explore-feed", params.lang, uid, params.favoritesReferenceBook?.key ?? ""],
    queryFn: ({ signal }) => buildSections(params, signal),
    enabled: !disabled,
    placeholderData: keepPreviousData,
  });

  return {
    sections: query.data ?? [],
    loading: query.isPending && !disabled,
    error: query.error ? (query.error instanceof Error ? query.error.message : "unknown") : null,
    retry: () => { query.refetch(); },
  };
}
