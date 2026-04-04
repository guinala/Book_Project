import { useState, useRef, useCallback } from "react";
import axios from "axios";
import type { Book } from "@/types/Book";
import { fetchFantasyBooks } from "@/services/api/openLibraryApi";
import { getErrorMessage } from "@/utils/apiErrors";

type UseFantasyBooksResult = {
  books: Book[];
  loading: boolean;
  error: string | null;
  fetchBooks: (limit?: number, lang?: string) => Promise<void>;
  cancelRequest: () => void;
}

export function useFantasyBook(): UseFantasyBooksResult {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortController = useRef<AbortController | null>(null);

  // useEffect(() => {
  //   abortController.current?.abort();
  //   abortController.current = new AbortController();

  //   const loadBooks = async () => {
  //     try {
  //       setLoading(true);
  //       setError(null);

  //       const mappedBooks = await fetchFantasyBooks(limit, lang, controller.signal);
  //       setBooks(mappedBooks);
  //     } catch (err) {
  //       if (axios.isCancel(err)) return;
  //       setError(getErrorMessage(err));
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   loadBooks();

  //   return () => abortController.current?.abort();
  // }, [limit, lang]);
  const fetchBooks = useCallback(async (limit: number = 20, lang: string = "es") => {
    abortController.current?.abort();
    abortController.current = new AbortController();

    try {
      setLoading(true);
      setError(null);
      const mappedBooks = await fetchFantasyBooks(limit, lang, abortController.current.signal);
      setBooks(mappedBooks);
    } catch (err) {
      if (axios.isCancel(err)) return;
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelRequest = useCallback(() => {
    abortController.current?.abort();
  }, []);

  return { books, loading, error, fetchBooks, cancelRequest };
}