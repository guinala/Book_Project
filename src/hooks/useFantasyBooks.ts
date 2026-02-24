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

interface OpenLibraryEdition {
  title?: string;
  covers?: number[];
  languages?: { key: string }[];  
}

interface OpenLibraryEditionsResponse {
  entries: OpenLibraryEdition[];
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

// Extrae el ID de obra del key completo: "/works/OL45804W" → "OL45804W"
function extractWorkId(key: string): string {
  return key.replace("/works/", "");
}

// Se busca la primera edición en español 
async function fetchSpanishEdition(
  workId: string,
  signal: AbortSignal
): Promise<{ title: string | null; cover_id: number | null }> {
  try {
    const { data } = await apiClient.get<OpenLibraryEditionsResponse>(
      `/works/${workId}/editions.json`,
      { signal }
    );

    const spanishEdition = data.entries.find((edition) =>
      edition.languages?.some((lang) => lang.key === "/languages/spa")
    );

    return {
      title: spanishEdition?.title ?? null,
      cover_id: spanishEdition?.covers?.[0] ?? null,
    };
  } catch {
    return { title: null, cover_id: null };
  }
}

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
            subject: "fantasy",
            language: "spa",
            fields: "key,title,author_name,first_publish_year,cover_i,edition_count",
            limit,
          },
          signal: controller.signal,
        });

        const editionResults = await Promise.all(
          data.docs.map((doc) =>
            fetchSpanishEdition(extractWorkId(doc.key), controller.signal)
          )
        );

        const mapped: Book[] = data.docs.map((doc, i) => ({
          key: doc.key,
          title: editionResults[i].title ?? doc.title,
          authors: doc.author_name ?? ["Autor desconocido"],
          first_publish_year: doc.first_publish_year ?? 0,
          cover_id: editionResults[i].cover_id ?? doc.cover_i ?? null,
          edition_count: doc.edition_count ?? 0,
        }));

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