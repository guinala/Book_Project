import { useState, useEffect } from "react";
import axios from "axios";
import i18n from "../plugins/i18n/i18n";
import type { GoogleBooksImageLinks, GoogleBooksResponse } from "../types/GoogleBooks";
import { googleBooksClient } from "../services/apiClients";
import { getErrorMessage } from "../utils/apiErrors";

export type Book = {
  key: string;
  title: string;
  authors: string[];
  first_publish_year: number;
  cover_url: string | null;
  edition_count: number;
}

type UseFantasyBooksResult = {
  books: Book[];
  loading: boolean;
  error: string | null;
}

const API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string;

function extractYear(dateStr?: string): number {
  if (!dateStr) return 0;
  return parseInt(dateStr.split("-")[0], 10) || 0;
}

function normalizeCoverUrl(imageLinks?: GoogleBooksImageLinks): string | null {
  const url = imageLinks?.thumbnail;
  if (!url) return null;
  return url
    .replace("http://", "https://")
    .replace("zoom=1", "zoom=2");
}

export function useFantasyBooks_Google(
  limit: number = 20,
  lang: string = "es"
): UseFantasyBooksResult {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data } = await googleBooksClient.get<GoogleBooksResponse>("/volumes", {
          params: {
            q: "subject:fantasy",
            langRestrict: lang,
            maxResults: Math.min(limit, 40),
            orderBy: "relevance",
            printType: "books",
            key: API_KEY,
          },
          signal: controller.signal,
        });

        if (!data.items || data.items.length === 0) {
          setBooks([]);
          return;
        }

        const unknownAuthor = i18n.t("book.unknownAuthor");

        const mappedBooks: Book[] = data.items.map((item) => ({
          key: item.id,
          title: item.volumeInfo.title,
          authors: item.volumeInfo.authors ?? [unknownAuthor],
          first_publish_year: extractYear(item.volumeInfo.publishedDate),
          cover_url: normalizeCoverUrl(item.volumeInfo.imageLinks),
          edition_count: 0,
        }));

        setBooks(mappedBooks);
      } catch (err) {
        if (axios.isCancel(err)) return;
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();

    return () => controller.abort();
  }, [limit, lang]);

  return { books, loading, error };
}