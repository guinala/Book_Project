import { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import type { Book } from "../types/Book";
import type { SearchFilter } from "../types/Search";

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  edition_count?: number;
}

interface OpenLibrarySearchResponse {
  docs: OpenLibraryDoc[];
  numFound: number;
}

interface UseBookSearchResult {
  books: Book[];
  loading: boolean;
  error: string | null;
  totalResults: number;
}

const apiClient = axios.create({
  baseURL: "https://openlibrary.org",
  headers: { "Content-Type": "application/json" },
});

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
  limit: number = 20
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

    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError(null);

        const searchParams = getSearchParams(query.trim(), filter);

        const { data } = await apiClient.get<OpenLibrarySearchResponse>(
          "/search.json",
          {
            params: {
              ...searchParams,
              fields:
                "key,title,author_name,first_publish_year,cover_i,edition_count",
              limit,
              lang: "es",
            },
            signal: controller.signal,
          }
        );

        setTotalResults(data.numFound);

        const mapped: Book[] = data.docs.map((doc) => ({
          key: doc.key,
          title: doc.title,
          authors: doc.author_name ?? ["Autor desconocido"],
          first_publish_year: doc.first_publish_year ?? 0,
          cover_id: doc.cover_i ?? null,
          edition_count: doc.edition_count ?? 0,
        }));

        setBooks(mapped);
      } catch (err) {
        if (axios.isCancel(err)) return;

        const axiosError = err as AxiosError;
        if (axiosError.response) {
          setError(
            `Error ${axiosError.response.status}: ${axiosError.response.statusText}`
          );
        } else if (axiosError.request) {
          setError(
            "No se pudo conectar con el servidor. Comprueba tu conexión."
          );
        } else {
          setError("Error inesperado al realizar la petición.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
    return () => controller.abort();
  }, [query, filter, limit]);

  return { books, loading, error, totalResults };
}
