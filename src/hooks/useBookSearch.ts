import { useState, useEffect } from "react";
import axios from "axios";
import type { Book } from "../types/Book";
import type { SearchFilter } from "../types/Search";
import { searchBooks } from "../services/api/openLibraryApi";
import { getErrorMessage } from "../utils/apiErrors";

type UseBookSearchResult = {
  books: Book[];
  loading: boolean;
  error: string | null;
  totalResults: number;
}

function getSearchParams(
  query: string,
  filter: SearchFilter
): Record<string, string> {
  switch (filter) {
    case "titulo":
      return { title: query };
    case "autor":
      return { author: query };
    case "isbn":
      return { isbn: query.replace(/-/g, "") };
    case "todo":
    default:
      return { q: query };
  }
}

export function useBookSearch(
  query: string,
  filter: SearchFilter,
  limit: number = 20,
  lang: string = "es"
): UseBookSearchResult {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    if (!query.trim()) {
      setBooks([]);
      setLoading(false);
      setError(null);
      setTotalResults(0);
      return;
    }

    const controller = new AbortController();

    const loadBooks = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = getSearchParams(query.trim(), filter);
        const result = await searchBooks(params, limit, lang, controller.signal);

        setBooks(result.books);
        setTotalResults(result.totalResults);
      } catch (err) {
        if (axios.isCancel(err)) return;
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    loadBooks();

    return () => controller.abort();
  }, [query, filter, limit, lang]);

  return { books, loading, error, totalResults };
}