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

const FEATURED_COUNT = 4;
const STANDARD_COUNT = 6;

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

  // 4. Genre-grid (no books — special render in ExplorePage)
  entries.push({ id: "genre-grid", type: "genre-grid", books: [], isFallback: false });

  // 5. Acclaimed
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

  // 9. Because-reading
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

  // 10. Waiting
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

export function useExploreFeed(params: ExploreSectionsParams, disabled = false): ExploreSectionsResult {
  const [sections, setSections] = useState<SectionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Always-fresh params without making shelf mutations a re-fetch trigger.
  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; });

  // Deps limited to lang/disabled — shelf mutations must not rebuild the feed.
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
  }, [params.lang, disabled]);

  useEffect(() => { fetch(); }, [fetch]);

  return { sections, loading, error, retry: fetch };
}
