import { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";

export interface Book {
  key: string;
  title: string;
  authors: string[];
  first_publish_year: number;
  cover_id: number | null;
  edition_count: number;
}

interface OpenLibraryEditionDoc {
  key?: string;
  title?: string;
  language?: string[];
  cover_i?: number;
}

interface OpenLibraryEditions {
  numFound: number;
  docs: OpenLibraryEditionDoc[];
}

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  edition_count?: number;
  editions?: OpenLibraryEditions;
}

interface OpenLibrarySearchResponse {
  docs: OpenLibraryDoc[];
  numFound: number;
}

interface UseFantasyBooksResult {
  books: Book[];
  loading: boolean;
  error: string | null;
}

const BASE_URL = "https://openlibrary.org";

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export function useFantasyBooks(limit: number = 20): UseFantasyBooksResult {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data } = await apiClient.get<OpenLibrarySearchResponse>("/search.json", {
          params: {
            q: "subject:fantasy language:spa",
            lang: "es",
            fields: [
              "key",
              "title",
              "author_name",
              "first_publish_year",
              "cover_i",
              "edition_count",
              "editions",
              "editions.title",
              "editions.language",
              "editions.cover_i",
            ].join(","),
            limit,
          },
          signal: controller.signal,
        });

        const mapped: Book[] = data.docs.map((doc) => {
          const bestEdition = doc.editions?.docs?.[0];

          const title = bestEdition?.title ?? doc.title;

          const cover_id = bestEdition?.cover_i ?? doc.cover_i ?? null;

          return {
            key: doc.key,
            title,
            authors: doc.author_name ?? ["Autor desconocido"],
            first_publish_year: doc.first_publish_year ?? 0,
            cover_id,
            edition_count: doc.edition_count ?? 0,
          };
        });

        setBooks(mapped);
      } catch (err) {
        if (axios.isCancel(err)) return;

        const axiosError = err as AxiosError;
        if (axiosError.response) {
          setError(`Error ${axiosError.response.status}: ${axiosError.response.statusText}`);
        } else if (axiosError.request) {
          setError("No se pudo conectar con el servidor. Comprueba tu conexión.");
        } else {
          setError("Error inesperado al realizar la petición.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();

    return () => controller.abort();
  }, [limit]);

  return { books, loading, error };
}