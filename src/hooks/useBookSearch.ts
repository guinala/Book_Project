import { useState, useCallback, useRef } from "react";
import axios from "axios";
import type { Book } from "@/types/Book";
import type { SearchFilter } from "@/types/Search";
import { searchBooks } from "@/services/api/openLibraryApi";
import { getErrorMessage } from "@/utils/apiErrors";
import { getSearchParams } from "@/utils/searchParams";
import { saveBooksToDB } from "@/services/firebase/firebaseBooks";

type UseBookSearchResult = {
  books: Book[];
  loading: boolean;
  error: string | null;
  totalResults: number;
  fetchBooks: (query: string, filter: SearchFilter, limit?: number, lang?: string) => Promise<void>;
  resetBookResults: () => void;
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
    abortController.current = new AbortController(); 

    try {
        setLoading(true);
        setError(null);

        const params = getSearchParams(query.trim(), filter);
        const result = await searchBooks(params, limit, lang, abortController.current.signal);

        // const deduplicated = result.books
        //   .sort((a, b) => {
        //     if (a.cover_id && !b.cover_id) return -1;
        //     if (!a.cover_id && b.cover_id) return 1;
        //     return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
        //   })
        //   .filter(
        //     (book, i, self) => i === self.findIndex(b => b.title.toLowerCase().trim() === book.title.toLowerCase().trim())
        //   );
        const isBetter = (a: Book, b: Book) =>
          (!!a.cover_id && !b.cover_id) ||
          (!!a.cover_id === !!b.cover_id && (a.ratingCount ?? 0) > (b.ratingCount ?? 0));

        const bestByTitle = new Map<string, Book>();
        for (const book of result.books) {
          const key = book.title.toLowerCase().trim();
          const existing = bestByTitle.get(key);
          if (!existing || isBetter(book, existing)) {
            bestByTitle.set(key, book);
          }
        }

        const deduplicated = [...bestByTitle.values()];

        setBooks(deduplicated);
        setTotalResults(result.totalResults);
        saveBooksToDB(deduplicated, lang);
      } catch (err) {
        if (axios.isCancel(err)) return;
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
  }, []);

  const resetBookResults = useCallback(() => {
      abortController.current?.abort();
      setBooks([]);
      setLoading(false);
      setError(null);
      setTotalResults(0);
  }, [])
  // useEffect(() => {
  //   abortController.current?.abort();
  //   abortController.current = new AbortController();
    
  //   if (!query.trim()) {
  //     setBooks([]);
  //     setLoading(false);
  //     setError(null);
  //     setTotalResults(0);
  //     return;
  //   }

    

    //const loadBooks = async () => {
    //   try {
    //     setLoading(true);
    //     setError(null);

    //     const params = getSearchParams(query.trim(), filter);
    //     const result = await searchBooks(params, limit, lang, controller.signal);

    //     setBooks(result.books);
    //     setTotalResults(result.totalResults);
    //   } catch (err) {
    //     if (axios.isCancel(err)) return;
    //     setError(getErrorMessage(err));
    //   } finally {
    //     setLoading(false);
    //   }
    // };

    //loadBooks();

  //   return () => abortController.current?.abort();
  // }, [query, filter, limit, lang]);

  return { books, loading, error, totalResults, fetchBooks, resetBookResults };
}