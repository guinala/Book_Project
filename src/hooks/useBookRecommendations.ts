import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import type { Book } from "@/types/Book";
import { fetchBooksByGenre } from "@/services/api/openLibraryApi";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";

const PAGE_SIZE = 5;

export function useBookRecommendations(genre: string, excludeKey: string) {
  const [pool, setPool] = useState<Book[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const shownKeys = useRef<Set<string>>(new Set());
  const abortController = useRef<AbortController | null>(null);
  const { lang } = useCurrentLanguage();

  const pickNext = useCallback((fullPool: Book[]): Book[] => {
    const available = fullPool.filter((b) => !shownKeys.current.has(b.key));
    // Si no quedan suficientes sin mostrar, reiniciar el historial
    const source = available.length >= PAGE_SIZE ? available : fullPool;
    if (available.length < PAGE_SIZE) shownKeys.current.clear();

    const shuffled = [...source].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, PAGE_SIZE);
    picked.forEach((b) => shownKeys.current.add(b.key));
    return picked;
  }, []);

  useEffect(() => {
    if (!genre) return;

    abortController.current?.abort();
    abortController.current = new AbortController();
    shownKeys.current.clear();
    setLoading(true);

    fetchBooksByGenre(genre, 30, lang, abortController.current.signal)
      .then((results) => {
        const filtered = results.filter((b) => b.key !== excludeKey);
        setPool(filtered);
        setBooks(pickNext(filtered));
        setLoading(false);
      })
      .catch((err) => {
        if (axios.isCancel(err)) {
          setLoading(false);
          return;
        }
        setLoading(false);
      });

    return () => abortController.current?.abort();
  }, [genre, excludeKey, lang, pickNext]);

  const refresh = useCallback(() => {
    setBooks(pickNext(pool));
  }, [pool, pickNext]);

  return { books, loading, refresh };
}
