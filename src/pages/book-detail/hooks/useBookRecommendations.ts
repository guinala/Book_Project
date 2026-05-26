import { useEffect, useRef, useCallback, useState } from "react";
import axios from "axios";
import type { Book } from "@/types/Book";
import { fetchBooksByGenre } from "@/services/api/openLibraryApi";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import { getRecommendationsFromDB, saveBooksToDB } from "@/services/firebase/firebaseBooks";
import { completeBookTitles } from "@/services/api/bookComplete";
import { dedupBestByTitle } from "@/utils/bookDedup";

const PAGE_SIZE = 6;
const MIN_DB_BOOKS = 20;

export function useBookRecommendations(genre: string, excludeKey: string) {
  const [pool, setPool] = useState<Book[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const shownKeys = useRef<Set<string>>(new Set());
  const abortController = useRef<AbortController | null>(null);
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

  useEffect(() => {
    if (!genre) return;

    abortController.current?.abort();
    abortController.current = new AbortController();
    const signal = abortController.current.signal;
    shownKeys.current.clear();

    const loadBooks = async () => {
      const dbBooks = await getRecommendationsFromDB(genre, lang, excludeKey, MIN_DB_BOOKS);

      if(dbBooks) {
        const sortedBooks = dedupBestByTitle(dbBooks);
        setPool(sortedBooks);
        setBooks(pickNext(sortedBooks));

        //Obtener titulos en otro idioma
        completeBookTitles(sortedBooks, lang);
        return;
      }

      //Fallback => API
      const results = await fetchBooksByGenre(genre, 30, lang, signal);
      const deduplicatedBooks = dedupBestByTitle(results);
      const filteredBooks = deduplicatedBooks.filter((b) => b.key !== excludeKey);
      setPool(filteredBooks);
      setBooks(pickNext(filteredBooks));
      saveBooksToDB(deduplicatedBooks, lang);
    };

    loadBooks().catch((err) => {
      if(axios.isCancel(err)) {
        return;
      }
    });

    return () => abortController.current?.abort();
  }, [genre, excludeKey, lang, pickNext]);

  const refresh = useCallback(() => {
    setBooks(pickNext(pool));
  }, [pool, pickNext]);

  return { books, refresh };
}
