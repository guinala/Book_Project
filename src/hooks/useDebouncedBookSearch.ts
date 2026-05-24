import { useEffect, useState } from "react";
import { searchBooksWithFallback } from "@/services/firebase/firebaseBooks";
import type { Book } from "@/types/Book";

type UseDebouncedBookSearchOptions = {
  lang: string;
  limit?: number;
  delayMs?: number;
};

export function useDebouncedBookSearch(
  query: string,
  { lang, limit = 8, delayMs = 400 }: UseDebouncedBookSearchOptions
) {
  const [results, setResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(() => {
      setSearching(true);

      searchBooksWithFallback(trimmed, lang, limit)
        .then((books) => {
          if (!cancelled) {
            setResults(books);
            setSearching(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResults([]);
            setSearching(false);
          }
        });
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, lang, limit, delayMs]);

  return { results, searching };
}