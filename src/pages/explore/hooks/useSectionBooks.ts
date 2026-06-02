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
import { useAuth } from "@/context/auth/useAuth";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

type FetchResult = { books: Book[]; isFallback: boolean; authorName?: string };

function dedupByKey(books: Book[]): Book[] {
  const seen = new Set<string>();
  return books.filter(b => {
    if (seen.has(b.key)) return false;
    seen.add(b.key);
    return true;
  });
}

export function useSectionBooks(
  type: ExploreSectionType,
  params: ExploreSectionParams = {},
  lang: string,
  count = 6,
  disabled = false,
): UseSectionResult {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const normalizedParams = {
    referenceBookKey: params.referenceBookKey,
    referenceGenre: params.referenceGenre,
    favoriteGenre: params.favoriteGenre,
    favoriteAuthorKey: params.favoriteAuthorKey,
    favoriteGenreLabel: params.favoriteGenreLabel,
    userAuthorKeys: params.userAuthorKeys?.join(",") ?? "",
    favoritesReferenceBookKey: params.favoritesReferenceBook?.key,
  };

  const query = useQuery({
    queryKey: ["section", type, lang, count, uid, normalizedParams],
    queryFn: ({ signal }) => fetchSection(type, params, lang, count, signal),
    enabled: !disabled,
    placeholderData: keepPreviousData,
  });

  return {
    books: dedupByKey(query.data?.books ?? []),
    loading: query.isPending && !disabled,
    error: query.error ? "error" : null,
    retry: () => { query.refetch(); },
    isFallback: query.data?.isFallback ?? false,
    authorName: query.data?.authorName,
  };
}

async function fetchSection(
  type: ExploreSectionType,
  params: ExploreSectionParams,
  lang: string,
  count: number,
  signal?: AbortSignal,
): Promise<FetchResult> {
  const year = new Date().getFullYear();

  switch (type) {
    case "trending": {
      const raw = await getTrendingBooks(lang, count + 10, signal);
      const books = raw.slice(0, count);
      if (books.length > 0) return { books, isFallback: false };
      const fallbackRaw = await getTopRatedBooks(lang, count + 10, signal);
      return { books: fallbackRaw.slice(0, count), isFallback: true };
    }

    case "acclaimed": {
      const raw = await getTopRatedBooks(lang, count + 20, signal);
      const books = raw.filter(b => (b.rating ?? 0) >= 4.5).slice(0, count);
      return { books, isFallback: false };
    }

    case "top-rated":
      return { books: await getTopRatedBooks(lang, count, signal), isFallback: false };

    case "because-reading": {
      if (!params.referenceBookKey || !params.referenceGenre) return { books: [], isFallback: false };
      const raw = await getRecommendationsByGenre(params.referenceGenre, lang, params.referenceBookKey, count + 10, signal);
      const books = raw
        .filter(b => (b.rating ?? 0) >= 4)
        .filter(b => !params.userShelfKeys?.has(b.key))
        .slice(0, count);
      return { books, isFallback: false };
    }

    case "because-liked": {
      if (!params.referenceBookKey || !params.referenceGenre) return { books: [], isFallback: false };
      const raw = await getRecommendationsByGenre(params.referenceGenre, lang, params.referenceBookKey, count + 10, signal);
      const books = raw
        .filter(b => (b.rating ?? 0) >= 4)
        .filter(b => !params.userShelfKeys?.has(b.key))
        .slice(0, count);
      return { books, isFallback: false };
    }

    case "because-finished": {
      if (!params.referenceBookKey || !params.referenceGenre) return { books: [], isFallback: false };
      const raw = await getRecommendationsByGenre(params.referenceGenre, lang, params.referenceBookKey, count + 10, signal);
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
      const raw = await getRecommendationsByGenre(genre, lang, excludeKey, count + 10, signal);
      const books = raw
        .filter(b => (b.rating ?? 0) >= 4)
        .filter(b => !params.userShelfKeys?.has(b.key))
        .slice(0, count);
      return { books, isFallback: false };
    }

    case "more-genre": {
      if (!params.favoriteGenre) return { books: [], isFallback: false };
      const raw = await getRecommendationsByGenre(params.favoriteGenre, lang, "", count + 10, signal);
      const books = raw
        .filter(b => !params.userShelfKeys?.has(b.key))
        .slice(0, count);
      return { books, isFallback: false };
    }

    case "new-releases-for-you": {
      const [byAuthor, byGenre] = await Promise.all([
        params.userAuthorKeys?.length
          ? getAuthorNewReleases(params.userAuthorKeys, year, lang, count + 10, signal)
          : Promise.resolve([] as Book[]),
        params.favoriteGenre
          ? getGenreNewReleases(params.favoriteGenre, year, lang, count + 10, signal)
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
      return { books: await getNewReleaseBooks(year, lang, count, signal), isFallback: true };
    }

    case "waiting": {
      const books = (params.wantToReadBooks ?? []).slice(0, count);
      return { books, isFallback: false };
    }

    case "more-author": {
      if (params.favoriteAuthorKey) {
        const raw = await getAuthorBooksFromDB(params.favoriteAuthorKey, "", lang, signal);
        const books = raw.filter((b) => !params.userShelfKeys?.has(b.key)).slice(0, count);
        return { books, isFallback: false };
      }
      const popular = await getPopularAuthorWithBooks(lang, signal);
      if (!popular) return { books: [], isFallback: false };
      return { books: popular.books.slice(0, count), isFallback: false, authorName: popular.authorName };
    }

    case "genre-grid":
      return { books: [], isFallback: false };

    case "top-genre": {
      if (!params.favoriteGenre) return { books: [], isFallback: false };
      const raw = await getRecommendationsByGenre(params.favoriteGenre, lang, "", count + 10, signal);
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
