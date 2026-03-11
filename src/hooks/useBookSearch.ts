import { useState, useEffect } from "react";
import axios from "axios";
import type { Book } from "../types/Book";
import type { SearchFilter } from "../types/Search";
import type { OpenLibrarySearchResponse } from "../types/OpenLibrary";
import { openLibraryClient } from "../services/apiClients";
import { getErrorMessage } from "../utils/apiErrors";
import { mapOpenLibraryDoc } from "../utils/bookMapper";

type UseBookSearchResult = {
  books: Book[];
  loading: boolean;
  error: string | null;
  totalResults: number;
}

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
  limit: number = 20,
  lang: string = "es"
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

        const { data } = await openLibraryClient.get<OpenLibrarySearchResponse>(
          "/search.json",
          {
            params: {
              ...searchParams,
              fields:
                "key,title,author_name,first_publish_year,cover_i,edition_count",
              limit,
              lang,
            },
            signal: controller.signal,
          }
        );

        setTotalResults(data.numFound);

        const mapped: Book[] = data.docs.map(mapOpenLibraryDoc);

        setBooks(mapped);
      } catch (err) {
        if (axios.isCancel(err)) return;
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
    return () => controller.abort();
  }, [query, filter, limit, lang]);

  return { books, loading, error, totalResults };
}