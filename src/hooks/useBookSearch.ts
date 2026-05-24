import { useState, useCallback, useRef } from "react";
import axios from "axios";
import type { Book } from "@/types/Book";
import type { SearchFilter } from "@/types/Search";
import { searchBooks } from "@/services/api/openLibraryApi";
import { getErrorMessage } from "@/utils/apiErrors";
import { getSearchParams } from "@/utils/searchParams";
import { saveBooksToDB, searchBooksInDB } from "@/services/firebase/firebaseBooks";

type UseBookSearchResult = {
  books: Book[];
  loading: boolean;
  error: string | null;
  totalResults: number;
  fetchBooks: (query: string, filter: SearchFilter, limit?: number, lang?: string) => Promise<void>;
  resetBookResults: () => void;
}

function dedupBestByTitle(books: Book[]): Book[] {
  const isBetter = (a: Book, b: Book) =>
    (!!a.cover_id && !b.cover_id) ||
    (!!a.cover_id === !!b.cover_id && (a.ratingCount ?? 0) > (b.ratingCount ?? 0));

  const bestByTitle = new Map<string, Book>();
  for (const book of books) {
    const key = book.title.toLowerCase().trim();
    const existing = bestByTitle.get(key);
    if (!existing || isBetter(book, existing)) {
      bestByTitle.set(key, book);
    }
  }
  return [...bestByTitle.values()];
}


export function useBookSearch(): UseBookSearchResult {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const abortController = useRef<AbortController | null>(null);

  const fetchBooks = useCallback(async  (
    query: string,
    filter: SearchFilter,
    limit: number = 20,
    lang: string = "es"
  ) => {
    abortController.current?.abort();          
    const controller = new AbortController(); 
    abortController.current = controller;
    const { signal } = controller;

    try {
      setLoading(true);
      setError(null);

      const trimmed = query.trim();

      //Database
      const fromDb = await searchBooksInDB(trimmed, filter, lang, limit);
      if (signal.aborted) {
        return;
      }

      if (fromDb.length > 6) {
        setBooks(fromDb);
        setTotalResults(fromDb.length);
        return;
      }

      //Si hay menos de 6 libros obtenidos, se recurre a la API
      const dbKeys = new Set(fromDb.map((book) => book.key));
      let apiBooks: Book[] = [];

      try {
        const params = getSearchParams(trimmed, filter);
        const result = await searchBooks(params, limit, lang, signal);
        const deduplicated = dedupBestByTitle(result.books);
        apiBooks = deduplicated.filter((b) => !dbKeys.has(b.key));
      } catch (err) {
        if (axios.isCancel(err)) {
          return;
        }
        apiBooks = []; //Si Open Library falla
      }

      if (signal.aborted) {
        return;
      }

      const mergedBooks = [...fromDb, ...apiBooks];
      setBooks(mergedBooks);
      setTotalResults(mergedBooks.length);

      if(apiBooks.length > 0) {
        saveBooksToDB(apiBooks, lang);
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const resetBookResults = useCallback(() => {
      abortController.current?.abort();
      setBooks([]);
      setLoading(false);
      setError(null);
      setTotalResults(0);
  }, [])

  return { books, loading, error, totalResults, fetchBooks, resetBookResults };
}