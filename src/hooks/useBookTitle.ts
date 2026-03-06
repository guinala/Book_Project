import { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import type { Book } from "../types/Book";

// ─── OpenLibrary types ───

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
  subject?: string[];
  ratings_average?: number;
  ratings_count?: number;
  editions?: OpenLibraryEditions;
}

interface OpenLibrarySearchResponse {
  docs: OpenLibraryDoc[];
  numFound: number;
}

// ─── Google Books types ───

interface GoogleBooksImageLinks {
  thumbnail?: string;
  smallThumbnail?: string;
}

interface GoogleBooksVolumeInfo {
  imageLinks?: GoogleBooksImageLinks;
}

interface GoogleBooksItem {
  volumeInfo: GoogleBooksVolumeInfo;
}

interface GoogleBooksResponse {
  items?: GoogleBooksItem[];
  totalItems: number;
}

// ─── Hook result ───

interface UseBookByTitleResult {
  book: Book | null;
  loading: boolean;
  error: string | null;
}

// ─── Clients ───

const openLibraryClient = axios.create({
  baseURL: "https://openlibrary.org",
  headers: { "Content-Type": "application/json" },
});

const googleBooksClient = axios.create({
  baseURL: "https://www.googleapis.com/books/v1",
  headers: { "Content-Type": "application/json" },
});

const GOOGLE_BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string;

// ─── Helpers ───

function normalizeCoverUrl(imageLinks?: GoogleBooksImageLinks): string | null {
  const url = imageLinks?.thumbnail;
  if (!url) return null;
  return url.replace("http://", "https://");
}

async function fetchGoogleCover(
  title: string,
  author: string,
  signal: AbortSignal
): Promise<string | null> {
  try {
    const query = `intitle:${title}${author ? `+inauthor:${author}` : ""}`;

    const { data } = await googleBooksClient.get<GoogleBooksResponse>("/volumes", {
      params: {
        q: query,
        maxResults: 1,
        fields: "items(volumeInfo/imageLinks)",
        key: GOOGLE_BOOKS_API_KEY,
      },
      signal,
    });

    return normalizeCoverUrl(data.items?.[0]?.volumeInfo?.imageLinks) ?? null;
  } catch {
    return null;
  }
}

// ─── Hook ───

export function useBookTitle(title: string): UseBookByTitleResult {
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!title.trim()) {
      setBook(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchBook = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Buscar el libro en OpenLibrary por título
        const { data } = await openLibraryClient.get<OpenLibrarySearchResponse>(
          "/search.json",
          {
            params: {
              title: title.trim(),
              fields: [
                "key",
                "title",
                "author_name",
                "first_publish_year",
                "cover_i",
                "edition_count",
                "subject",
                "ratings_average",
                "ratings_count",
                "editions",
                "editions.title",
                "editions.language",
                "editions.cover_i",
              ].join(","),
              limit: 1,
              lang: "es",
            },
            signal: controller.signal,
          }
        );

        if (!data.docs || data.docs.length === 0) {
          setBook(null);
          setError("No se encontró el libro en OpenLibrary.");
          setLoading(false);
          return;
        }

        const doc = data.docs[0];
        const bestEdition = doc.editions?.docs?.[0];
        const bookTitle = bestEdition?.title ?? doc.title;
        const cover_id = bestEdition?.cover_i ?? doc.cover_i ?? null;

        const mappedBook: Book = {
          key: doc.key,
          title: bookTitle,
          authors: doc.author_name ?? ["Autor desconocido"],
          first_publish_year: doc.first_publish_year ?? 0,
          cover_id,
          edition_count: doc.edition_count ?? 0,
          genre: doc.subject?.[0],
          rating: doc.ratings_average,
          ratingCount: doc.ratings_count,
        };

        // 2. Mostrar el libro inmediatamente (sin portada de Google todavía)
        setBook(mappedBook);
        setLoading(false);

        // 3. Buscar la portada en Google Books
        const coverUrl = await fetchGoogleCover(
          mappedBook.title,
          mappedBook.authors[0] ?? "",
          controller.signal
        );

        // 4. Actualizar con la portada si se encontró
        if (coverUrl) {
          setBook((prev) => (prev ? { ...prev, cover_url: coverUrl } : prev));
        }
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
        setLoading(false);
      }
    };

    fetchBook();

    return () => controller.abort();
  }, [title]);

  return { book, loading, error };
}