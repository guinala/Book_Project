import { useState, useEffect } from "react";
import axios from "axios";
import i18n from "../plugins/i18n/i18n";
import type { Book } from "../types/Book";
import type { OpenLibrarySearchResponse } from "../types/OpenLibrary";
import { openLibraryClient } from "../services/apiClients";
import { getErrorMessage } from "../utils/apiErrors";
import { getLangIso639_2 } from "../utils/langConversion";

type UseFantasyBooksResult = {
  books: Book[];
  loading: boolean;
  error: string | null;
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