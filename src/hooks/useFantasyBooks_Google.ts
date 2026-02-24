import { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";

export interface Book {
  key: string;
  title: string;
  authors: string[];
  first_publish_year: number;
  cover_url: string | null;   
  edition_count: number;
}

interface GoogleBooksImageLinks {
  thumbnail?: string;
  smallThumbnail?: string;
}

interface GoogleBooksVolumeInfo {
  title: string;
  authors?: string[];
  publishedDate?: string;    
  imageLinks?: GoogleBooksImageLinks;
}

interface GoogleBooksItem {
  id: string;
  volumeInfo: GoogleBooksVolumeInfo;
}

interface GoogleBooksResponse {
  items?: GoogleBooksItem[];
  totalItems: number;
}

interface UseFantasyBooksResult {
  books: Book[];
  loading: boolean;
  error: string | null;
}

const BASE_URL = "https://www.googleapis.com/books/v1";
const API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string;

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

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

export function useFantasyBooks_Google(limit: number = 20): UseFantasyBooksResult {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data } = await apiClient.get<GoogleBooksResponse>("/volumes", {
          params: {
            q: "subject:fantasy",
            langRestrict: "es",             // en español
            maxResults: Math.min(limit, 40), // Google Books permite máximo 40
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

        const mapped: Book[] = data.items.map((item) => ({
          key: item.id,
          title: item.volumeInfo.title,
          authors: item.volumeInfo.authors ?? ["Autor desconocido"],
          first_publish_year: extractYear(item.volumeInfo.publishedDate),
          cover_url: normalizeCoverUrl(item.volumeInfo.imageLinks),
          edition_count: 0, //Este dato no se expone
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