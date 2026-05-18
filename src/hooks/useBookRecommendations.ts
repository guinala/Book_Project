import { useEffect, useRef, useCallback, useState } from "react";
import axios from "axios";
import type { Book } from "@/types/Book";
import { fetchBooksByGenre, fetchWorkEditionByLang } from "@/services/api/openLibraryApi";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import { getRecommendationsFromDB, saveBooksToDB, updateBookTitleToDB } from "@/services/firebase/firebaseBooks";

const PAGE_SIZE = 6;
const MIN_DB_BOOKS = 20;

export function useBookRecommendations(genre: string, excludeKey: string) {
  const [pool, setPool] = useState<Book[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
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
    const signal = abortController.current.signal;
    shownKeys.current.clear();

    const loadBooks = async () => {
      const dbBooks = await getRecommendationsFromDB(genre, lang, excludeKey, MIN_DB_BOOKS);

      if(dbBooks) {
        const sortedBooks = sortAndDeduplicate(dbBooks);
        setPool(sortedBooks);
        setBooks(pickNext(sortedBooks));

        //Obtener titulos en otro idioma
        completeOtherLangTitles(sortedBooks, lang);
        return;
      }

      //Fallback => API
      const results = await fetchBooksByGenre(genre, 30, lang, signal);
      const deduplicatedBooks = sortAndDeduplicate(results);
      const filteredBooks = deduplicatedBooks.filter((b) => b.key !== excludeKey);
      setPool(filteredBooks);
      setBooks(pickNext(filteredBooks));
      saveBooksToDB(deduplicatedBooks, lang);
    };

    loadBooks().catch((err) => {
      if(axios.isCancel(err)) {
        return;
      }
    });

    return () => abortController.current?.abort();
  }, [genre, excludeKey, lang, pickNext]);

  //   fetchBooksByGenre(genre, 30, lang, abortController.current.signal)
  //     .then((results) => {
  //       const deduplicated = results
  //         .sort((a, b) => {
  //           if (a.cover_id && !b.cover_id) return -1;
  //           if (!a.cover_id && b.cover_id) return 1;
  //           return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
  //         })
  //         .filter(
  //           (book, i, self) => i === self.findIndex(b => b.title.toLowerCase().trim() === book.title.toLowerCase().trim())
  //         );
  //       const filtered = deduplicated.filter((b) => b.key !== excludeKey);
  //       setPool(filtered);
  //       setBooks(pickNext(filtered));
  //       saveBooksToDB(deduplicated, lang);
  //     })
  //     .catch((err) => {
  //       if (axios.isCancel(err)) return;
  //     });
    
  //   return () => abortController.current?.abort();
  // }, [genre, excludeKey, lang, pickNext]);

  const refresh = useCallback(() => {
    setBooks(pickNext(pool));
  }, [pool, pickNext]);

  return { books, refresh };
}

function sortAndDeduplicate(books: Book[]): Book[] {
   return books
      .sort((a, b) => {
        if (a.cover_id && !b.cover_id) return -1;
        if (!a.cover_id && b.cover_id) return 1;
        return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
      })
      .filter(
        (book, i, self) =>
          i === self.findIndex((b) => b.title.toLowerCase().trim() === book.title.toLowerCase().trim())
      );
}

function completeOtherLangTitles(books: Book[], lang: string): void {
  const otherLang = lang === "es" ? "en" : "es";
  const missing = books.filter((b) => !b.titles?.[otherLang]);
  if (missing.length === 0) return;

  Promise.all(
    missing.map(async (book) => {
      const edition = await fetchWorkEditionByLang(book.key, otherLang);
      if (edition) {
        await updateBookTitleToDB(book.key, edition.title, otherLang, edition.isbn);
      }
    })
  ).catch(() => {});
}
