import { useCallback, useEffect, useState } from "react";
import type { Book } from "@/types/Book";
import type { ExploreSectionType } from "@/types/ExploreTypes";
import {
  getAuthorBooksFromDB,
  getAuthorNewReleases,
  getBooksByGenre,
  getGenreNewReleases,
  getNewReleaseBooks,
  getRecommendationsByGenre,
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
  referenceBooks: Book[];
  wantToReadBooks: Book[];
};

export type ExploreSectionsResult = {
  sections: SectionEntry[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

const N = 6;

export function useExploreSections(params: ExploreSectionsParams, disabled = false): ExploreSectionsResult {
  const [sections, setSections] = useState<SectionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (disabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setSections(await buildSections(params));
    } catch {
      setError("error");
    } finally {
      setLoading(false);
    }
  }, [
    params.lang,
    params.userShelfKeys.size,
    params.userAuthorKeys.join(","),
    params.favoriteGenre,
    params.favoriteAuthorKey,
    params.referenceBooks.map(b => b.key).join(","),
    params.wantToReadBooks.length,
  ]);

  useEffect(() => { fetch(); }, [fetch]);

  return { sections, loading, error, retry: fetch };
}

async function buildSections(params: ExploreSectionsParams): Promise<SectionEntry[]> {
  const {
    lang, userShelfKeys, userAuthorKeys,
    favoriteGenre, favoriteGenreLabel,
    favoriteAuthorKey, favoriteAuthorName,
    referenceBooks, wantToReadBooks,
  } = params;

  const year = new Date().getFullYear();
  // Excluir libros del usuario
  const seenKeys = new Set<string>(userShelfKeys);
  const entries: SectionEntry[] = [];

  function claim(books: Book[]): Book[] {
    books.forEach(b => seenKeys.add(b.key));
    return books;
  }

  // ── 1. Trending ──────────────────────────────────────────────────────────────
  const trendingRaw = await getTrendingBooks(lang, N + 10);
  const trendingBooks = trendingRaw.filter(b => !seenKeys.has(b.key)).slice(0, N);
  if (trendingBooks.length > 0) {
    entries.push({ id: "trending", type: "trending", books: claim(trendingBooks), isFallback: false });
  } else {
    const fallbackRaw = await getTopRatedBooks(lang, N + 10);
    const fallback = fallbackRaw.filter(b => !seenKeys.has(b.key)).slice(0, N);
    entries.push({ id: "trending", type: "trending", books: claim(fallback), isFallback: true });
  }

  // ── Helper: because-reading ──────────────────────────────────────────────────
  async function addBecauseReading(book: Book, index: number) {
    if (!book.genre) return;
    const raw = await getRecommendationsByGenre(book.genre, lang, book.key, N + 20);
    const books = raw.filter(b => (b.rating ?? 0) >= 4 && !seenKeys.has(b.key)).slice(0, N);
    if (books.length === 0) return;
    entries.push({
      id: `because-reading-${index}`,
      type: "because-reading",
      books: claim(books),
      isFallback: false,
      referenceBookKey: book.key,
      referenceBookTitle: book.title,
      referenceGenre: book.genre,
    });
  }

  // ── 2. Because-reading (libro 0) ─────────────────────────────────────────────
  if (referenceBooks[0]) await addBecauseReading(referenceBooks[0], 0);

  // ── 3. More-genre (popularidad: addCount) ─────────────────────────────────────
  if (favoriteGenre) {
    const raw = await getBooksByGenre(favoriteGenre, lang, N + 20);
    const books = raw.filter(b => !seenKeys.has(b.key)).slice(0, N);
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

  // ── 4. Because-reading (libro 1) ─────────────────────────────────────────────
  if (referenceBooks[1]) await addBecauseReading(referenceBooks[1], 1);

  // ── 5. Top-genre (mejor valorados ≥ 4.3) ────────────────────────────────────
  if (favoriteGenre) {
    const raw = await getRecommendationsByGenre(favoriteGenre, lang, "", N + 20);
    const books = raw.filter(b => (b.rating ?? 0) >= 4.3 && !seenKeys.has(b.key)).slice(0, N);
    if (books.length > 0) {
      entries.push({
        id: "top-genre",
        type: "top-genre",
        books: claim(books),
        isFallback: false,
        favoriteGenre,
        favoriteGenreLabel: favoriteGenreLabel ?? undefined,
      });
    }
  }

  // ── 6. New releases for you ──────────────────────────────────────────────────
  const [byAuthor, byGenre] = await Promise.all([
    userAuthorKeys.length
      ? getAuthorNewReleases(userAuthorKeys, year, lang, N + 10)
      : Promise.resolve([] as Book[]),
    favoriteGenre
      ? getGenreNewReleases(favoriteGenre, year, lang, N + 10)
      : Promise.resolve([] as Book[]),
  ]);
  const innerSeen = new Set<string>(seenKeys);
  const merged: Book[] = [];
  for (const b of [...byAuthor, ...byGenre]) {
    if (!innerSeen.has(b.key)) { innerSeen.add(b.key); merged.push(b); }
  }
  merged.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const newReleasesBooks = merged.slice(0, N);
  if (newReleasesBooks.length > 0) {
    entries.push({ id: "new-releases-for-you", type: "new-releases-for-you", books: claim(newReleasesBooks), isFallback: false });
  } else {
    const fallbackRaw = await getNewReleaseBooks(year, lang, N + 10);
    const fallback = fallbackRaw.filter(b => !seenKeys.has(b.key)).slice(0, N);
    if (fallback.length > 0) {
      entries.push({ id: "new-releases-for-you", type: "new-releases-for-you", books: claim(fallback), isFallback: true });
    }
  }

  // ── 7. Because-reading (libro 2) ─────────────────────────────────────────────
  if (referenceBooks[2]) await addBecauseReading(referenceBooks[2], 2);

  // ── 8. Waiting ───────────────────────────────────────────────────────────────
  if (wantToReadBooks.length > 0) {
    entries.push({
      id: "waiting",
      type: "waiting",
      books: wantToReadBooks.slice(0, N),
      isFallback: false,
    });
  }

  // ── 9. Because-reading (libros 3+) ───────────────────────────────────────────
  for (let i = 3; i < referenceBooks.length; i++) {
    await addBecauseReading(referenceBooks[i], i);
  }

  // ── 10. More-author ──────────────────────────────────────────────────────────
  if (favoriteAuthorKey) {
    const raw = await getAuthorBooksFromDB(favoriteAuthorKey, "", lang);
    const books = raw.filter(b => !seenKeys.has(b.key)).slice(0, N);
    if (books.length > 0) {
      entries.push({
        id: "more-author",
        type: "more-author",
        books: claim(books),
        isFallback: false,
        favoriteAuthorKey,
        favoriteAuthorName: favoriteAuthorName ?? undefined,
      });
    }
  }

  return entries;
}
