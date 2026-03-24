import { useState, useEffect } from "react";
import axios from "axios";
import type { Book } from "../types/Book";
import { fetchFantasyBooks } from "../services/api/openLibraryApi";
import { fetchGoogleCovers } from "../services/api/googleBooksApi";
import { getErrorMessage } from "../utils/apiErrors";

type UseFantasyBooksHybridResult = {
  books: Book[];
  loading: boolean;
  error: string | null;
}

export function useFantasyBooks_GoogleOpen(
  limit: number = 20,
  lang: string = "es"
): UseFantasyBooksHybridResult {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadBooks = async () => {
      try {
        setLoading(true);
        setError(null);

        // Libros de OpenLibrary
        const mappedBooks = await fetchFantasyBooks(limit, lang, controller.signal);
        setBooks(mappedBooks);
        setLoading(false);

        // Portadas de Google Books
        const covers = await fetchGoogleCovers(mappedBooks, controller.signal);

        setBooks((prev) =>
          prev.map((book, i) =>
            covers[i] ? { ...book, cover_url: covers[i] } : book
          )
        );
      } catch (err) {
        if (axios.isCancel(err)) return;
        setError(getErrorMessage(err));
        setLoading(false);
      }
    };

    loadBooks();

    return () => controller.abort();
  }, [limit, lang]);

  return { books, loading, error };
}