import { useEffect, useState } from "react";
import { fetchSynopsisRace } from "@/services/api/synopsisSources";
import type { Book } from "@/types/Book";

// Cache por bookKey + lang.
const synopsisCache = new Map<string, string>();
const inFlightCache = new Map<string, Promise<string>>();

function cacheKey(bookKey: string, lang: string): string {
  return `${bookKey}|${lang}`;
}

export function useBookSynopsis(book: Book, lang: string): string {
  const initial = book.synopsis ?? synopsisCache.get(cacheKey(book.key, lang)) ?? "";
  const [synopsis, setSynopsis] = useState(initial);
  const [prevKey, setPrevKey] = useState(book.key);

  if (book.key !== prevKey) {
    setPrevKey(book.key);
    setSynopsis(book.synopsis ?? synopsisCache.get(cacheKey(book.key, lang)) ?? "");
  }

  useEffect(() => {
    if (book.synopsis) return;
    const key = cacheKey(book.key, lang);
    if (synopsisCache.has(key)) {
      setSynopsis(synopsisCache.get(key)!);
      return;
    }
    const controller = new AbortController();
    const existing = inFlightCache.get(key);
    const promise = existing ?? fetchSynopsisRace({
      title: book.title,
      isbn: book.isbn,
      author: book.authors[0],
      lang,
      signal: controller.signal,
      workKey: book.key,
    });
    if (!existing) inFlightCache.set(key, promise);

    promise
      .then((result) => {
        if (result) {
          synopsisCache.set(key, result);
          setSynopsis(result);
        }
      })
      .catch(() => {})
      .finally(() => {
        inFlightCache.delete(key);
      });

    return () => controller.abort();
  }, [book.key, book.synopsis, book.title, book.isbn, book.authors, lang]);

  return synopsis;
}
