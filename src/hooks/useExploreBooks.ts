import { useState, useRef, useCallback } from "react";
import axios from "axios";
import type { Book } from "@/types/Book";
import { fetchFantasyBooks, fetchWorkEditionByLang, getWork } from "@/services/api/openLibraryApi";
import { getErrorMessage } from "@/utils/apiErrors";
import { getExploreBooksFromDB, saveBooksToDB, saveGenreToDB, updateBookTitleToDB } from "@/services/firebase/firebaseBooks";
import { detectGenre } from "@/utils/genreUtils";
import { logger } from "@/utils/logger";

const LOCAL_STORAGE_KEY = (lang: string) => `trama_cache_${lang}`;
const LOCAL_STORAGE_TTL = 24 * 60 * 60 * 1000; // 24 horas (1 día)

type UseFantasyBooksHybridResult = {
  books: Book[];
  loading: boolean;
  error: string | null;
  fetchBooks: (limit?: number, lang?: string) => Promise<void>;
  cancelRequest: () => void;
}

function loadFromStorage(lang: string): Book[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY(lang));
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("books" in parsed) ||
      !("ts" in parsed) ||
      typeof (parsed as { ts: unknown }).ts !== "number" ||
      !Array.isArray((parsed as { books: unknown }).books)
    ) {
      return null;
    }

    const { books, ts } = parsed as { books: unknown[]; ts: number };
    if (Date.now() - ts > LOCAL_STORAGE_TTL) {
      localStorage.removeItem(LOCAL_STORAGE_KEY(lang));
      return null;
    }

    const valid = books.filter((book): book is Book => (
      typeof book === "object" &&
      book !== null &&
      typeof (book as Book).key === "string" &&
      typeof (book as Book).title === "string"
    ));

    return valid.length > 0 ? valid : null;
  } catch { return null; }
}

function saveToStorage(books: Book[], lang: string): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY(lang), JSON.stringify({ books, ts: Date.now() }));
  } 
  catch { /* storage lleno */ }
}

async function completeTitles(books: Book[], lang: string): Promise<Book[]> {
  const missing = books.filter(b => !b.titles?.[lang]);
  if (missing.length === 0) return books;

  const results = await Promise.all(
    missing.map(async (book) => {
      const result = await fetchWorkEditionByLang(book.key, lang);
      if (result) {
        updateBookTitleToDB(book.key, result.title, lang, result.isbn)
          .catch(err => logger.warn('[Enrich] Error guardando título:', err));
      }
      return { key: book.key, result };
    })
  );

  const completedMap = new Map(
    results
      .filter(r => r.result !== null)
      .map(r => [r.key, r.result!])
  );

  if (completedMap.size === 0) return books;

  return books.map(book => {
    const completed = completedMap.get(book.key);
    if (!completed) return book;
    return {
      ...book,
      title: completed.title,
      titles: { ...(book.titles ?? {}), [lang]: completed.title },
      ...(completed.isbn ? { isbns: { ...(book.isbns ?? {}), [lang]: completed.isbn } } : {}),
    };
  });
}

export function useExploreBooks(): UseFantasyBooksHybridResult {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const fetchBooks = useCallback(async (limit: number = 20, lang: string = "es") => {
    
    const stored = loadFromStorage(lang);
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
        saveToStorage(dbBooks, lang);

        completeTitles(dbBooks, lang)
          .then(completed => {
            if(completed !== dbBooks) {
              setBooks(completed);
              saveToStorage(completed, lang);
            }
          })
          .catch(() => {});
          
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
    const controller = new AbortController();
    abortController.current = controller;

    const fetchWithRetry = async (retried = false): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const mappedBooks = await fetchFantasyBooks(limit, lang, controller.signal);
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

        saveToStorage(deduplicated, lang);
        saveBooksToDB(deduplicated, lang);
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
