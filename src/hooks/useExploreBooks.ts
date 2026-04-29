import { useState, useRef, useCallback } from "react";
import axios from "axios";
import type { Book } from "@/types/Book";
import { fetchFantasyBooks, getWork } from "@/services/api/openLibraryApi";
// import { fetchGoogleCovers } from "@/services/api/googleBooksApi"; 
import { getErrorMessage } from "@/utils/apiErrors";
import { getExploreBooksFromDB, saveBooksToDB, saveGenreToDB } from "@/services/firebase/firebaseBooks";
import { detectGenre } from "@/utils/genreUtils";
import { logger } from "@/utils/logger";

const LOCAL_STORAGE_KEY = 'trama_cache_v3';
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

export function useExploreBooks(): UseFantasyBooksHybridResult {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const fetchBooks = useCallback(async (limit: number = 20, lang: string = "es") => {
    
    const stored = loadFromStorage();
    if (stored) {
      logger.log("[Explore] Sirviendo desde localStorage:", stored.length, "libros");
      setBooks(stored);
      setLoading(false);
      return;
    }

    logger.log("[Explore] localStorage vacío o expirado. Consultando Firestore con lang:", lang, "limit:", limit);

    try {
      const dbBooks = await getExploreBooksFromDB(lang, limit);
      logger.log("[Explore] Firestore devolvió:", dbBooks ? dbBooks.length + " libros" : "null (insuficientes)");
      if (dbBooks) {
        setBooks(dbBooks);
        setLoading(false);
        saveToStorage(dbBooks);
        const nullGenreBooks = dbBooks.filter(b => !b.genre);
        if (nullGenreBooks.length > 0) {
          nullGenreBooks.forEach(async (b) => {
            try {
              const work = await getWork(b.key);
              const genre = detectGenre(work.subjects);
              if (genre) saveGenreToDB(b.key, genre);
            } catch { logger.log("No se ha podido obtener el genero (otra vez)") }
          });
        }

        return;
      }
    } catch {
      logger.log("Ha habido un error o no se han encontrado libros")
    }

    abortController.current?.abort();
    abortController.current = new AbortController();

    const fetchWithRetry = async (retried = false): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const mappedBooks = await fetchFantasyBooks(limit, lang, abortController.current!.signal);
        const deduplicated = mappedBooks
          .sort((a, b) => {
            if (a.cover_id && !b.cover_id) return -1;
            if (!a.cover_id && b.cover_id) return 1;
            return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
          })
          .filter(
            (book, i, self) => i === self.findIndex(b => b.title.toLowerCase().trim() === book.title.toLowerCase().trim())
          );
        setBooks(deduplicated);
        setLoading(false);

        saveToStorage(deduplicated);
        saveBooksToDB(deduplicated, lang);
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