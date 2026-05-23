import { useCallback, useEffect, useMemo, useState } from "react";
import type { Book } from "@/types/Book";
import type { ExploreSectionParams, ExploreSectionType, UseSectionResult } from "@/types/ExploreTypes";
import {
  getAuthorBooksFromDB,
  getAuthorNewReleases,
  getGenreNewReleases,
  getNewReleaseBooks,
  getPopularAuthorWithBooks,
  getRecommendationsByGenre,
  getTopRatedBooks,
  getTrendingBooks,
} from "@/services/firebase/firebaseBooks";
import { useExploreCache } from "./useExploreCache";
import { useAuth } from "./useAuth";
import type { ExploreCacheEntry } from "@/context/explore_cache_init";

export function useSectionBooks(
  type: ExploreSectionType,
  params: ExploreSectionParams = {},
  lang: string,
  count = 6,
  disabled = false,
): UseSectionResult {
  const cache = useExploreCache();
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const cacheKey = useMemo(
    () => JSON.stringify({
      type, lang, count, uid,
      referenceBookKey: params.referenceBookKey,
      referenceGenre: params.referenceGenre,
      favoriteGenre: params.favoriteGenre,
      favoriteAuthorKey: params.favoriteAuthorKey,
      favoriteGenreLabel: params.favoriteGenreLabel,
      userAuthorKeys: params.userAuthorKeys?.join(",") ?? "",
      favoritesReferenceBookKey: params.favoritesReferenceBook?.key,
    }),
    [
      type, lang, count, uid,
      params.referenceBookKey, params.referenceGenre,
      params.favoriteGenre, params.favoriteAuthorKey, params.favoriteGenreLabel,
      params.userAuthorKeys, params.favoritesReferenceBook?.key,
    ],
  );

  const initialEntry = cache.get(cacheKey);
  const [books, setBooks] = useState<Book[]>(() => initialEntry?.books ?? []);
  const [isFallback, setIsFallback] = useState<boolean>(() => initialEntry?.isFallback ?? false);
  const [loading, setLoading] = useState<boolean>(() => !initialEntry && !disabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (disabled) {
      setLoading(false);
      return;
    }

    const entry = cache.get(cacheKey);
    if (entry) {
      setBooks(entry.books);
      setIsFallback(entry.isFallback);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSection(type, params, lang, count)
      .then(result => {
        const seen = new Set<string>();
        const unique = result.books.filter(b => {
          if (seen.has(b.key)) return false;
          seen.add(b.key);
          return true;
        });
        const newEntry: ExploreCacheEntry = { books: unique, isFallback: result.isFallback };
        cache.set(cacheKey, newEntry);
        if (cancelled) return;
        setBooks(unique);
        setIsFallback(result.isFallback);
      })
      .catch(err => {
        if (cancelled) return;
        console.error("[ExploreSection error]", err);
        setError("error");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, disabled]);

  const retry = useCallback(async () => {
    if (disabled) {
      return;
    }
    setLoading(true);
    setError(null);

    fetchSection(type, params, lang, count)
      .then(result => {
        const seen = new Set<string>();
        const unique = result.books.filter(b => {
          if (seen.has(b.key)) {
            return false;
          }
          seen.add(b.key);
          return true;
        });
        cache.set(cacheKey, { books: unique, isFallback: result.isFallback });
        setBooks(unique);
        setIsFallback(result.isFallback);
      })
      .catch(err => {
        console.error("[ExploreSection error]", err);
        setError("error");
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, disabled]);

  return { books, loading, error, retry, isFallback };
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
      const raw = await getTrendingBooks(lang, count + 10);
      const books = raw.slice(0, count);
      if (books.length > 0) return { books, isFallback: false };
      const fallbackRaw = await getTopRatedBooks(lang, count + 10);
      return { books: fallbackRaw.slice(0, count), isFallback: true };
    }

    case "acclaimed": {
      const raw = await getTopRatedBooks(lang, count + 20);
      const books = raw.filter(b => (b.rating ?? 0) >= 4.5).slice(0, count);
      return { books, isFallback: false };
    }

    case "top-rated":
      return { books: await getTopRatedBooks(lang, count), isFallback: false };

    case "because-reading": {
      if (!params.referenceBookKey || !params.referenceGenre) return { books: [], isFallback: false };
      const raw = await getRecommendationsByGenre(params.referenceGenre, lang, params.referenceBookKey, count + 10);
      const books = raw
        .filter(b => (b.rating ?? 0) >= 4)
        .filter(b => !params.userShelfKeys?.has(b.key))
        .slice(0, count);
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
      const genre = params.favoritesReferenceBook?.genre ?? params.referenceGenre;
      const excludeKey = params.favoritesReferenceBook?.key ?? params.referenceBookKey;
      if (!genre || !excludeKey) return { books: [], isFallback: false };
      const raw = await getRecommendationsByGenre(genre, lang, excludeKey, count + 10);
      const books = raw
        .filter(b => (b.rating ?? 0) >= 4)
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
      const [byAuthor, byGenre] = await Promise.all([
        params.userAuthorKeys?.length
          ? getAuthorNewReleases(params.userAuthorKeys, year, lang, count + 10)
          : Promise.resolve([] as Book[]),
        params.favoriteGenre
          ? getGenreNewReleases(params.favoriteGenre, year, lang, count + 10)
          : Promise.resolve([] as Book[]),
      ]);
      const seen = new Set<string>();
      const merged: Book[] = [];
      for (const b of [...byAuthor, ...byGenre]) {
        if (!seen.has(b.key) && !params.userShelfKeys?.has(b.key)) {
          seen.add(b.key);
          merged.push(b);
        }
      }
      merged.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      if (merged.length > 0) return { books: merged.slice(0, count), isFallback: false };
      return { books: await getNewReleaseBooks(year, lang, count), isFallback: true };
    }

    case "waiting": {
      const books = (params.wantToReadBooks ?? []).slice(0, count);
      return { books, isFallback: false };
    }

    case "more-author": {
      if (params.favoriteAuthorKey) {
        const raw = await getAuthorBooksFromDB(params.favoriteAuthorKey, "", lang);
        const books = raw.filter(b => !params.userShelfKeys?.has(b.key)).slice(0, count);
        return { books, isFallback: false };
      }
      const popular = await getPopularAuthorWithBooks(lang);
      if (!popular) return { books: [], isFallback: false };
      return { books: popular.books.slice(0, count), isFallback: false };
    }

    case "genre-grid":
      return { books: [], isFallback: false };

    case "top-genre": {
      if (!params.favoriteGenre) return { books: [], isFallback: false };
      const raw = await getRecommendationsByGenre(params.favoriteGenre, lang, "", count + 10);
      const books = raw
        .filter(b => (b.rating ?? 0) >= 4.3)
        .filter(b => !params.userShelfKeys?.has(b.key))
        .slice(0, count);
      return { books, isFallback: false };
    }

    default:
      return { books: [], isFallback: false };
  }
}
