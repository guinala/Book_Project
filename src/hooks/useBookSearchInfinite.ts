import { useInfiniteQuery } from "@tanstack/react-query";
import type { Book } from "@/types/Book";
import type { SearchFilter } from "@/types/Search";
import { searchBooks } from "@/services/api/openLibraryApi";
import { getSearchParams } from "@/utils/searchParams";
import { saveBooksToDB, searchBooksInDB } from "@/services/firebase/firebaseBooks";
import { dedupBestByTitle } from "@/utils/bookDedup";

const PAGE_SIZE = 20;
const DB_POOL_SIZE = 40;

type SearchPage =
  | { phase: "db"; books: Book[] }
  | { phase: "api"; books: Book[]; totalResults: number; page: number };

type SearchPageParam = { phase: "db" } | { phase: "api"; page: number };

function dedupByKey(books: Book[]): Book[] {
  const seen = new Set<string>();
  return books.filter((b) => {
    if (seen.has(b.key)) return false;
    seen.add(b.key);
    return true;
  });
}

export function useBookSearchInfinite(query: string, filter: SearchFilter, lang: string) {
  const trimmed = query.trim();

  const infinite = useInfiniteQuery({
    queryKey: ["book-search", trimmed, filter, lang],
    initialPageParam: { phase: "db" } as SearchPageParam,
    queryFn: async ({ pageParam, signal }): Promise<SearchPage> => {
      if (pageParam.phase === "db") {
        const books = await searchBooksInDB(trimmed, filter, lang, DB_POOL_SIZE);
        return { phase: "db", books };
      }
      const params = getSearchParams(trimmed, filter);
      const { books, totalResults } = await searchBooks(params, PAGE_SIZE, lang, signal, pageParam.page);
      const deduped = dedupBestByTitle(books);
      if (deduped.length > 0) saveBooksToDB(deduped, lang); // fire-and-forget
      return { phase: "api", books: deduped, totalResults, page: pageParam.page };
    },
    getNextPageParam: (lastPage, allPages): SearchPageParam | undefined => {
      if (lastPage.phase === "db") return { phase: "api", page: 1 };
      const apiLoaded = allPages
        .filter((p): p is Extract<SearchPage, { phase: "api" }> => p.phase === "api")
        .reduce((n, p) => n + p.books.length, 0);
      return apiLoaded < lastPage.totalResults
        ? { phase: "api", page: lastPage.page + 1 }
        : undefined;
    },
    enabled: trimmed !== "",
  });

  const pages = infinite.data?.pages ?? [];
  const books = dedupByKey(pages.flatMap((p) => p.books));
  const apiPages = pages.filter((p): p is Extract<SearchPage, { phase: "api" }> => p.phase === "api");
  const totalResults = apiPages.at(-1)?.totalResults ?? books.length;

  return {
    books,
    totalResults,
    loading: infinite.isPending && trimmed !== "",
    error: infinite.error ? "error" : null,
    hasNextPage: infinite.hasNextPage,
    isFetchingNextPage: infinite.isFetchingNextPage,
    fetchNextPage: () => { infinite.fetchNextPage(); },
  };
}
