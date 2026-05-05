import { useCallback, useEffect, useState } from "react";
import type { Book } from "@/types/Book";
import type { ExploreSectionParams, ExploreSectionType, UseSectionResult } from "@/types/ExploreTypes";
import {
  getAuthorBooksFromDB,
  getAuthorNewReleases,
  getBooksByGenre,
  getGenreNewReleases,
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
  }, [
    type, lang, count,
    params.referenceBookKey, params.referenceGenre,
    params.favoriteGenre, params.favoriteAuthorKey, params.favoriteGenreLabel,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    params.userAuthorKeys?.join(","),
    params.userShelfKeys?.size,
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
      const raw = await getTrendingBooks(lang, count + 10);
      const books = raw.filter(b => !params.userShelfKeys?.has(b.key)).slice(0, count);
      if (books.length > 0) return { books, isFallback: false };
      const fallbackRaw = await getTopRatedBooks(lang, count + 10);
      const fallback = fallbackRaw.filter(b => !params.userShelfKeys?.has(b.key)).slice(0, count);
      return { books: fallback, isFallback: true };
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
