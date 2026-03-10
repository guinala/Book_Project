import { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import i18n from "../plugins/i18n/i18n";
import type { Book } from "../types/Book";

type OpenLibraryEditionDoc = {
  key?: string;
  title?: string;
  language?: string[];
  cover_i?: number;
}

type OpenLibraryEditions = {
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

type OpenLibrarySearchResponse = {
  docs: OpenLibraryDoc[];
  numFound: number;
}

type UseFantasyBooksResult = {
  books: Book[];
  loading: boolean;
  error: string | null;
}

const BASE_URL = "https://openlibrary.org";

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

function getLangIso639_2(lang: string): string {
  return lang === "en" ? "eng" : "spa";
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

export function useFantasyBooks(
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

        const langCode = getLangIso639_2(lang);

        const { data } = await apiClient.get<OpenLibrarySearchResponse>("/search.json", {
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
          const edition = doc.editions?.docs?.[0];

          const title = edition?.title ?? doc.title;
          const cover_id = edition?.cover_i ?? doc.cover_i ?? null;

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