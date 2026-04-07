import { useState, useRef, useCallback } from "react";
import axios from "axios";
import type { Book } from "@/types/Book";
import { fetchFantasyBooks } from "@/services/api/openLibraryApi";
import { fetchGoogleCovers } from "@/services/api/googleBooksApi";
import { getErrorMessage } from "@/utils/apiErrors";

const LOCAL_STORAGE_KEY = 'trama_cache';
const LOCAL_STORAGE_TTL = 24 * 60 * 60 * 1000; // 24 horas (1 día)

function loadFromStorage(): Book[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const { books, ts } = JSON.parse(raw) as { books: Book[]; ts: number };
    if (Date.now() - ts > LOCAL_STORAGE_TTL) { localStorage.removeItem(LOCAL_STORAGE_KEY); return null; }
    return books;
  } catch { return null; }
}

function saveToStorage(books: Book[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ books, ts: Date.now() }));
  } catch { /* storage lleno — ignorar */ }
}

type UseFantasyBooksHybridResult = {
  books: Book[];
  loading: boolean;
  error: string | null;
  fetchBooks: (limit?: number, lang?: string) => Promise<void>;
  cancelRequest: () => void;
}

export function useFantasyBooks_GoogleOpen(): UseFantasyBooksHybridResult {
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

  //       // Libros de OpenLibrary
  //       const mappedBooks = await fetchFantasyBooks(limit, lang, controller.signal);
  //       setBooks(mappedBooks);
  //       setLoading(false);

  //       // Portadas de Google Books
  //       const covers = await fetchGoogleCovers(mappedBooks, controller.signal);

  //       setBooks((prev) =>
  //         prev.map((book, i) =>
  //           covers[i] ? { ...book, cover_url: covers[i] } : book
  //         )
  //       );
  //     } catch (err) {
  //       if (axios.isCancel(err)) return;
  //       setError(getErrorMessage(err));
  //       setLoading(false);
  //     }
  //   };

  //   loadBooks();

  //   return () => abortController.current?.abort();
  // }, [limit, lang]);

  const fetchBooks = useCallback(async (limit: number = 20, lang: string = "es") => {
    const stored = loadFromStorage();
    
    if (stored) {
      setBooks(stored);
      setLoading(false);
      return;
    }

    abortController.current?.abort();
    abortController.current = new AbortController();

    const fetchCovers = async (mappedBooks: Book[], retried = false): Promise<void> => {
      try {
        const covers = await fetchGoogleCovers(mappedBooks, abortController.current!.signal);
        const enrichedBooks = mappedBooks.map((book, i) =>
          covers[i] ? { ...book, cover_url: covers[i] } : book
        );
        saveToStorage(enrichedBooks);
        setBooks(enrichedBooks);
      } catch (err) {
        if (axios.isCancel(err)) return;
        if (!retried && axios.isAxiosError(err) && err.response?.status === 503) {
          setTimeout(() => fetchCovers(mappedBooks, true), 3000);
        } else {
          // Guardar con portadas de OpenLibrary
          saveToStorage(mappedBooks);
        }
      }
    };

    const fetchWithRetry = async (retried = false): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const mappedBooks = await fetchFantasyBooks(limit, lang, abortController.current!.signal);
        setBooks(mappedBooks);
        setLoading(false);

        fetchCovers(mappedBooks);
      } catch (err) {
        if (axios.isCancel(err)) return;
        if (!retried) {
          setTimeout(() => fetchWithRetry(true), 3000);
        } else {
          setError(getErrorMessage(err));
          setLoading(false);
        }
      }
    };

    fetchWithRetry();
  }, [])

  const cancelRequest = useCallback(() => {
    abortController.current?.abort();
  }, []);

  return { books, loading, error, fetchBooks, cancelRequest };
}