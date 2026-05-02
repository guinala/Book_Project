import { auth } from "@/services/firebase/firebaseInit";
import { addToShelf, encodeKey, getShelf, removeFromShelf, updateReadingProgress, updateShelfBookTitleToDB, type ShelfEntry } from "@/services/firebase/firebaseLibrary";
import { updateBookTitleToDB } from "@/services/firebase/firebaseBooks";
import { fetchWorkEditionByLang } from "@/services/api/openLibraryApi";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ShelfContext } from "./shelf_init";
import { logger } from "@/utils/logger";

export function ShelfProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Map<string, ShelfEntry>>(new Map());
  const [loading, setLoading] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const { i18n } = useTranslation();
  const lang = i18n.language.split('-')[0];

  useEffect(() => {
    let generation = 0;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const uid = firebaseUser?.uid;
      const myGen = ++generation;

      if (uid) {
        setUid(uid);
        setLoading(true);
        try {
          const shelf = await getShelf(uid);
          if (myGen !== generation) return;
          const shelfMap = new Map(
            (shelf ?? []).map(e => [encodeKey(e.book.key), e])
          );
          setEntries(shelfMap);
        } catch {
          if (myGen !== generation) return;
        } finally {
          if (myGen === generation) setLoading(false);
        }
      } else {
        setUid(null);
        setEntries(new Map());
      }
    });

    return () => unsubscribe();
  }, []);

  // Obtener títulos de otros idiomas
  useEffect(() => {
    if (!uid || entries.size === 0) return;

    const missing = [...entries.values()].filter(e => !e.book.titles?.[lang]);
    if (missing.length === 0) return;

    let cancelled = false;

    Promise.all(
      missing.map(async ({ book }) => {
        const result = await fetchWorkEditionByLang(book.key, lang);
        if (!result) return null;

        // Actualizar colección de libros y lirbos añadidos a estantería
        updateBookTitleToDB(book.key, result.title, lang, result.isbn)
          .catch(err => console.warn('[ShelfEnrich] Books update failed:', err));
        updateShelfBookTitleToDB(uid, book.key, result.title, lang, result.isbn)
          .catch(err => console.warn('[ShelfEnrich] Shelf update failed:', err));

        return { key: book.key, title: result.title, isbn: result.isbn };
      })
    ).then(results => {
      if (cancelled) return;
      const completed = results.filter(Boolean) as { key: string; title: string; isbn?: string }[];
      if (completed.length === 0) return;

      setEntries(prev => {
        const next = new Map(prev);
        for (const { key, title, isbn } of completed) {
          const encoded = encodeKey(key);
          const entry = next.get(encoded);
          if (!entry) continue;
          next.set(encoded, {
            ...entry,
            book: {
              ...entry.book,
              titles: { ...(entry.book.titles ?? {}), [lang]: title },
              ...(isbn ? { isbns: { ...(entry.book.isbns ?? {}), [lang]: isbn } } : {}),
            },
          });
        }
        return next;
      });
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [uid, entries.size, lang]);

  const addBook = async (book: Book, status: ShelfStatus) => {
    if (!uid) return;

    const prevStatus = entries.get(encodeKey(book.key))?.status ?? null;
    const rollback = new Map(entries);
    const newMap = new Map(entries);
    newMap.set(encodeKey(book.key), { book, status });
    setEntries(newMap);

    try {
      await addToShelf(uid, book, status, prevStatus);
    } catch {
      setEntries(rollback);
    }
  };

  const removeBook = async (bookKey: string) => {
    if (!uid) return;

    const rollback = new Map(entries);
    const newMap = new Map(entries);
    newMap.delete(encodeKey(bookKey));
    setEntries(newMap);

    try {
      await removeFromShelf(uid, bookKey);
    } catch {
      setEntries(rollback);
    }
  };

  const getStatus = (bookKey: string) => entries.get(encodeKey(bookKey))?.status ?? null;

  const getEntry = (bookKey: string): ShelfEntry | null => {
    const entry = entries.get(encodeKey(bookKey));
    if (!entry) return null;
    return {
      ...entry,
      book: {
        ...entry.book,
        title: entry.book.titles?.[lang] ?? entry.book.title,
        isbn: entry.book.isbns?.[lang] ?? entry.book.isbn,
      },
    };
  };

  const updateProgress = async (bookKey: string, currentPage: number, note?: string) => {
    if (!uid) return;

    const encoded = encodeKey(bookKey);
    const existing = entries.get(encoded);
    if (!existing) return;

    const rollback = new Map(entries);
    const totalPages = existing.book.pages ?? 0;
    const newStatus: ShelfStatus =
      totalPages > 0 && currentPage === totalPages ? "finished" : existing.status;
    const newMap = new Map(entries);
    newMap.set(encoded, { ...existing, currentPage, status: newStatus });
    setEntries(newMap);

    try {
      await updateReadingProgress(uid, existing, currentPage, note);
    } catch {
      setEntries(rollback);
    }
  };

  const shelfByStatus = useMemo(() => {
    const result: Record<ShelfStatus, Book[]> = {
      wantToRead: [], reading: [], finished: [], didNotFinish: [],
    };
    for (const { book, status } of entries.values()) {
      result[status].push({
        ...book,
        title: book.titles?.[lang] ?? book.title,
        isbn: book.isbns?.[lang] ?? book.isbn,
      });
    }
    logger.log(result);
    return result;
  }, [entries, lang]);

  return (
    <ShelfContext.Provider
      value={{ shelfByStatus, loading, addBook, removeBook, getStatus, getEntry, updateProgress }}
    >
      {children}
    </ShelfContext.Provider>
  );
}
