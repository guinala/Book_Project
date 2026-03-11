import { useState, useEffect } from "react";
import axios from "axios";
import i18n from "../plugins/i18n/i18n";
import type { Book } from "../types/Book";
import type { OpenLibrarySearchResponse } from "../types/OpenLibrary";
import type { GoogleBooksImageLinks, GoogleBooksResponse } from "../types/GoogleBooks";
import { openLibraryClient, googleBooksClient } from "../services/apiClients";
import { getErrorMessage } from "../utils/apiErrors";

type UseBookByTitleResult = {
  book: Book | null;
  loading: boolean;
  error: string | null;
}

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

export function useBookTitle(
  title: string,
  lang: string = "es"
): UseBookByTitleResult {
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
              lang,
            },
            signal: controller.signal,
          }
        );

        if (!data.docs || data.docs.length === 0) {
          setBook(null);
          setError(i18n.t("errors.bookNotFound"));
          setLoading(false);
          return;
        }

        const doc = data.docs[0];
        const bestEdition = doc.editions?.docs?.[0];
        const bookTitle = bestEdition?.title ?? doc.title;
        const cover_id = bestEdition?.cover_i ?? doc.cover_i ?? null;
        const unknownAuthor = i18n.t("book.unknownAuthor");

        const mappedBook: Book = {
          key: doc.key,
          title: bookTitle,
          authors: doc.author_name ?? [unknownAuthor],
          first_publish_year: doc.first_publish_year ?? 0,
          cover_id,
          edition_count: doc.edition_count ?? 0,
          genre: doc.subject?.[0],
          rating: doc.ratings_average,
          ratingCount: doc.ratings_count,
        };

        // 2. Mostrar el libro inmediatamente
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
        setError(getErrorMessage(err));
        setLoading(false);
      }
    };

    fetchBook();

    return () => controller.abort();
  }, [title, lang]);

  return { book, loading, error };
}