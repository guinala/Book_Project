import { useState, useRef, useCallback } from "react";
import axios from "axios";
import type { Book } from "@/types/Book";
import { fetchFantasyBooks } from "@/services/api/openLibraryApi";
// import { fetchGoogleCovers } from "@/services/api/googleBooksApi"; 
import { getErrorMessage } from "@/utils/apiErrors";
import { getExploreBooksFromDB, saveBooksToDB } from "@/services/firebase/firebase_books";

const LOCAL_STORAGE_KEY = 'trama_cache';
const LOCAL_STORAGE_TTL = 24 * 60 * 60 * 1000; // 24 horas (1 día)

function loadFromStorage(): Book[] | null {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return null;
    const { books, ts } = JSON.parse(data) as { books: Book[]; ts: number };
    if (Date.now() - ts > LOCAL_STORAGE_TTL) { localStorage.removeItem(LOCAL_STORAGE_KEY); return null; }
    return books;
  } catch { return null; }
}

function saveToStorage(books: Book[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ books, ts: Date.now() }));
  } 
  catch { /* storage lleno */ }
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

  const fetchBooks = useCallback(async (limit: number = 20, lang: string = "es") => {
    
    const stored = loadFromStorage();
    if (stored) {
      setBooks(stored);
      setLoading(false);
      return;
    }

    try {
      const dbBooks = await getExploreBooksFromDB(lang);
      if (dbBooks) {
        setBooks(dbBooks);
        setLoading(false);
        saveToStorage(dbBooks); 
        return;
      }
    } catch {
      console.log("Ha habido un error o no se han encontrado libros")
    }

    abortController.current?.abort();
    abortController.current = new AbortController();

    const fetchWithRetry = async (retried = false): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const mappedBooks = await fetchFantasyBooks(limit, lang, abortController.current!.signal);
        setBooks(mappedBooks);
        setLoading(false);

        saveToStorage(mappedBooks);
        saveBooksToDB(mappedBooks, lang);
        // fetchCovers(mappedBooks); 
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