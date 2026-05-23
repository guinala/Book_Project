import { useCallback, useEffect, useRef, useState } from "react";
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
  const entries: SectionEntry[] = [];

  function offShelf(books: Book[]): Book[] {
    return books.filter(b => !userShelfKeys.has(b.key));
  }

  // 1. Trending
  const trendingBooks = offShelf(await getTrendingBooks(lang, FETCH_LIMIT));
  if (trendingBooks.length > 0) {
    entries.push({ id: "trending", type: "trending", books: trendingBooks, isFallback: false });
  } else {
    const fallback = offShelf(await getTopRatedBooks(lang, FETCH_LIMIT));
    entries.push({ id: "trending", type: "trending", books: fallback, isFallback: true });
  }

  // 2. Because-liked
  if (likedBook?.genre) {
    const books = offShelf(
      await getRecommendationsByGenre(likedBook.genre, lang, likedBook.key, FETCH_LIMIT),
    ).filter(b => (b.rating ?? 0) >= 4);
    if (books.length > 0) {
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
  if (favoritesReferenceBook?.genre) {
    const books = offShelf(
      await getRecommendationsByGenre(favoritesReferenceBook.genre, lang, favoritesReferenceBook.key, FETCH_LIMIT),
    ).filter(b => (b.rating ?? 0) >= 4);
    if (books.length > 0) {
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
  if (finishedBook?.genre) {
    const books = offShelf(
      await getRecommendationsByGenre(finishedBook.genre, lang, finishedBook.key, FETCH_LIMIT),
    ).filter(b => (b.rating ?? 0) >= 4);
    if (books.length > 0) {
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
    const books = offShelf(await getTopAuthorBooks(resolvedAuthorKey, lang));
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
    const books = offShelf(await getBooksByGenre(favoriteGenre, lang, FETCH_LIMIT));
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
    if (!book.genre) continue;
    const books = offShelf(
      await getRecommendationsByGenre(book.genre, lang, book.key, FETCH_LIMIT),
    ).filter(b => (b.rating ?? 0) >= 4);
    if (books.length === 0) continue;
    entries.push({
      id: `because-reading-${i}`,
      type: "because-reading",
      books,
      isFallback: false,
      referenceBookKey: book.key,
      referenceBookTitle: book.title,
      referenceGenre: book.genre,
    });
  }

  // 9. New-releases-for-you
  const [byAuthor, byGenre] = await Promise.all([
    userAuthorKeys.length
      ? getAuthorNewReleases(userAuthorKeys, year, lang, FETCH_LIMIT)
      : Promise.resolve([] as Book[]),
    favoriteGenre
      ? getGenreNewReleases(favoriteGenre, year, lang, FETCH_LIMIT)
      : Promise.resolve([] as Book[]),
  ]);
  const innerSeen = new Set<string>();
  const merged: Book[] = [];
  for (const b of offShelf([...byAuthor, ...byGenre])) {
    if (!innerSeen.has(b.key)) { innerSeen.add(b.key); merged.push(b); }
  }
  merged.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  if (merged.length > 0) {
    entries.push({ id: "new-releases-for-you", type: "new-releases-for-you", books: merged, isFallback: false });
  } else {
    const fallback = offShelf(await getNewReleaseBooks(year, lang, FETCH_LIMIT));
    if (fallback.length > 0) {
      entries.push({ id: "new-releases-for-you", type: "new-releases-for-you", books: fallback, isFallback: true });
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
  const [sections, setSections] = useState<SectionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Always-fresh params without making shelf mutations a re-fetch trigger.
  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; });

  // Deps limited to lang/disabled/favoritesReferenceBook — shelf mutations must not rebuild the feed,
  // but favoritesReferenceBook is a one-time async resolution that must trigger a rebuild when it arrives.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetch = useCallback(async () => {
    if (disabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setSections(await buildSections(paramsRef.current));
    } catch {
      setError("error");
    } finally {
      setLoading(false);
    }
  }, [params.lang, disabled, params.favoritesReferenceBook?.key ?? ""]);

  useEffect(() => { fetch(); }, [fetch]);

  return { sections, loading, error, retry: fetch };
}
