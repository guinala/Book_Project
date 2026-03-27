import { useState, useEffect } from "react";
import axios from "axios";
import type { Book } from "@/types/Book";
import { fetchFantasyBooks } from "@/services/api/openLibraryApi";
import { getErrorMessage } from "@/utils/apiErrors";

type UseFantasyBooksResult = {
  books: Book[];
  loading: boolean;
  error: string | null;
}

export function useFantasyBooks(
  limit: number = 20,
  lang: string = "es"
): UseFantasyBooksResult {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadBooks = async () => {
      try {
        setLoading(true);
        setError(null);

        const mappedBooks = await fetchFantasyBooks(limit, lang, controller.signal);
        setBooks(mappedBooks);
      } catch (err) {
        if (axios.isCancel(err)) return;
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    loadBooks();

    return () => controller.abort();
  }, [limit, lang]);

  return { books, loading, error };
}