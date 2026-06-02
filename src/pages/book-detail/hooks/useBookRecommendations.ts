import { useEffect, useRef, useCallback, useState } from "react";
import type { Book } from "@/types/Book";
import { fetchBooksByGenre } from "@/services/api/openLibraryApi";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import { getRecommendationsFromDB, saveBooksToDB } from "@/services/firebase/firebaseBooks";
import { completeBookTitles } from "@/services/api/bookComplete";
import { dedupBestByTitle } from "@/utils/bookDedup";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

const PAGE_SIZE = 6;
const MIN_DB_BOOKS = 20;

export function useBookRecommendations(genre: string, excludeKey: string) {
  const [books, setBooks] = useState<Book[]>([]);
  const shownKeys = useRef<Set<string>>(new Set());
  const { lang } = useCurrentLanguage();

  const pickNext = useCallback((fullPool: Book[]): Book[] => {
    const available = fullPool.filter((b) => !shownKeys.current.has(b.key));
    // Si no quedan suficientes sin mostrar, reiniciar el historial
    const source = available.length >= PAGE_SIZE ? available : fullPool;
    if (available.length < PAGE_SIZE) shownKeys.current.clear();

    const shuffled = [...source].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, PAGE_SIZE);
    picked.forEach((b) => shownKeys.current.add(b.key));
    return picked;
  }, []);

  const { data: pool } = useQuery<Book[]>({
    queryKey: ["recommendations-pool", genre, lang, excludeKey],
    queryFn: async ({ signal }) => {
      const dbBooks = await getRecommendationsFromDB(genre, lang, excludeKey, MIN_DB_BOOKS);
      if (dbBooks) {
        const sortedBooks = dedupBestByTitle(dbBooks);
        completeBookTitles(sortedBooks, lang); // fire-and-forget
        return sortedBooks;
      }
      // Fallback => API
      const results = await fetchBooksByGenre(genre, 30, lang, signal);
      const deduplicatedBooks = dedupBestByTitle(results);
      saveBooksToDB(deduplicatedBooks, lang); // fire-and-forget
      return deduplicatedBooks.filter((b) => b.key !== excludeKey);
    },
    enabled: !!genre,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!pool) return;
    shownKeys.current.clear();
    setBooks(pickNext(pool));
  }, [pool, pickNext]);

  const refresh = useCallback(() => {
    if (!pool) return;
    setBooks(pickNext(pool));
  }, [pool, pickNext]);

  return { books, refresh };
}
