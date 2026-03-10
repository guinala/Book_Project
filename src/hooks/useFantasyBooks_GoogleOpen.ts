import { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import i18n from "../plugins/i18n/i18n";
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

interface UseFantasyBooksHybridResult {
  books: Book[];
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

function getLangIso639_2(lang: string): string {
  return lang === "en" ? "eng" : "spa";
}

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

function getErrorMessage(err: unknown): string {
  if (axios.isCancel(err)) return "";

  const axiosError = err as AxiosError;
  if (axiosError.response) {
    return i18n.t("errors.httpError", {
      status: axiosError.response.status,
      statusText: axiosError.response.statusText,
    });
  } else if (axiosError.request) {
    return i18n.t("errors.connectionFailed");
  }
  return i18n.t("errors.unexpectedError");
}

// ─── Hook ───

export function useFantasyBooks_GoogleOpen(
  limit: number = 20,
  lang: string = "es"
): UseFantasyBooksHybridResult {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError(null);

        const langCode = getLangIso639_2(lang);

        // 1. Obtener libros de OpenLibrary
        const { data } = await openLibraryClient.get<OpenLibrarySearchResponse>("/search.json", {
          params: {
            q: `subject:fantasy language:${langCode}`,
            lang,
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
            limit,
          },
          signal: controller.signal,
        });

        const unknownAuthor = i18n.t("book.unknownAuthor");

        const mappedBooks: Book[] = data.docs.map((doc) => {
          const bestEdition = doc.editions?.docs?.[0];
          const title = bestEdition?.title ?? doc.title;
          const cover_id = bestEdition?.cover_i ?? doc.cover_i ?? null;

          return {
            key: doc.key,
            title,
            authors: doc.author_name ?? [unknownAuthor],
            first_publish_year: doc.first_publish_year ?? 0,
            cover_id,
            edition_count: doc.edition_count ?? 0,
            genre: doc.subject?.[0],
            rating: doc.ratings_average,
            ratingCount: doc.ratings_count,
          };
        });

        // 2. Mostrar libros inmediatamente
        setBooks(mappedBooks);
        setLoading(false);

        // 3. Buscar portadas en Google Books en paralelo
        const coverPromises = mappedBooks.map((book) =>
          fetchGoogleCover(
            book.title,
            book.authors[0] ?? "",
            controller.signal
          )
        );

        const coverResults = await Promise.allSettled(coverPromises);

        // 4. Actualizar libros con las portadas obtenidas
        setBooks((prev) =>
          prev.map((book, i) => {
            const result = coverResults[i];
            const coverUrl =
              result.status === "fulfilled" ? result.value : null;

            return coverUrl ? { ...book, cover_url: coverUrl } : book;
          })
        );
      } catch (err) {
        if (axios.isCancel(err)) return;
        setError(getErrorMessage(err));
        setLoading(false);
      }
    };

    fetchBooks();

    return () => controller.abort();
  }, [limit, lang]);

  return { books, loading, error };
}