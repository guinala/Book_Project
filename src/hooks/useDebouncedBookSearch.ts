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
  const trimmed = query.trim();
  const [results, setResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");

  useEffect(() => {
    if (!trimmed) {
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(() => {
      setSearching(true);

      searchBooksWithFallback(trimmed, lang, limit)
        .then((books) => {
          if (!cancelled) {
            setResults(books);
            setSearchedQuery(trimmed);
            setSearching(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResults([]);
            setSearchedQuery(trimmed);
            setSearching(false);
          }
        });
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmed, lang, limit, delayMs]);

  const hasFreshResults = searchedQuery === trimmed;

  return {
    results: trimmed && hasFreshResults ? results : [],
    searching: !!trimmed && (!hasFreshResults || searching),
  };
}
