import { useState, useCallback, useRef } from "react";
import axios from "axios";
import type { Book } from "@/types/Book";
import type { SearchFilter } from "@/types/Search";
import { searchBooks } from "@/services/api/openLibraryApi";
import { getErrorMessage } from "@/utils/apiErrors";
import { getSearchParams } from "@/utils/searchParams";

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

        setBooks(result.books);
        setTotalResults(result.totalResults);
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