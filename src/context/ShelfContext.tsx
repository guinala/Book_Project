import { addToShelf, encodeKey, getShelf, removeFromShelf, updateReadingProgress, updateShelfBookTitleToDB, type ShelfEntry } from "@/services/firebase/firebaseLibrary";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import { useEffect, useMemo, useRef, useState } from "react";
import { ShelfContext } from "./shelf_init";
import { logger } from "@/utils/logger";
import { useAuth } from "@/hooks/useAuth";
import { fetchWorkEditionByLang } from "@/services/api/openLibraryApi";
import { updateBookTitleToDB } from "@/services/firebase/firebaseBooks";
import { notifyProgressUpdated, notifyShelfAdded, notifyShelfRemoved, notifyShelfStatusChanged } from "@/utils/toast";
import { useExploreCache } from "@/hooks/useExploreCache";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";

// Estantería "vacía" 
const EMPTY_ENTRIES = new Map<string, ShelfEntry>();

export function ShelfProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const exploreCache = useExploreCache();
  const uid = user?.uid ?? null;
  const { lang } = useCurrentLanguage();
  const [entries, setEntries] = useState<Map<string, ShelfEntry>>(new Map());
  // uid cuya estantería ya se cargó
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const entriesRef = useRef(entries);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    if (!uid) {
      return;
    }
    let cancelled = false;

    getShelf(uid)
      .then((shelf) => {
        if (cancelled) {
          return;
        }
        setEntries(new Map((shelf ?? []).map((e) => [encodeKey(e.book.key), e])));
        setLoadedUid(uid);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadedUid(uid);
        }
      });
    return () => { cancelled = true; };
  }, [uid]);

  const ready = uid !== null && loadedUid === uid;
  const loading = uid !== null && loadedUid !== uid;
  const visibleEntries = useMemo(
    () => (ready ? entries : EMPTY_ENTRIES),
    [ready, entries]
  );

  useEffect(() => {
    if (!uid || !ready || entries.size === 0) {
      return;
    }

    const missing = [...entries.values()].filter(e => !e.book.titles?.[lang]);
    if (missing.length === 0) {
      return;
    }

    let cancelled = false;

    Promise.all(
      missing.map(async ({ book }) => {
        const result = await fetchWorkEditionByLang(book.key, lang);
        if (!result) return null;

        updateBookTitleToDB(book.key, result.title, lang, result.isbn)
          .catch(err => logger.warn('[ShelfEnrich] Books update failed:', err));
        updateShelfBookTitleToDB(uid, book.key, result.title, lang, result.isbn)
          .catch(err => logger.warn('[ShelfEnrich] Shelf update failed:', err));

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
  }, [uid, ready, entries.size, lang]);

  const addBook = async (book: Book, status: ShelfStatus, opts?: { silent?: boolean }) => {
    if (!uid) return;

    const prevStatus = entriesRef.current.get(encodeKey(book.key))?.status ?? null;
    const rollback = new Map(entriesRef.current);
    const newMap = new Map(entriesRef.current);
    newMap.set(encodeKey(book.key), { book, status });
    setEntries(newMap);

    try {
      await addToShelf(uid, book, status, prevStatus);
      exploreCache.markDirty();

      if (!opts?.silent) {
        const localizedBook = {
          ...book,
          title: book.titles?.[lang] ?? book.title,
        };
        if (prevStatus === null) {
          notifyShelfAdded(localizedBook, status, () =>
            removeBook(book.key, { silent: true }),
          );
        } else if (prevStatus !== status) {
          notifyShelfStatusChanged(localizedBook, prevStatus, status, () =>
            addBook(book, prevStatus, { silent: true }),
          );
        }
      }
    } catch {
      setEntries(rollback);
    }
  };

  const removeBook = async (bookKey: string, opts?: { silent?: boolean }) => {
    if (!uid) return;

    const prev = entriesRef.current.get(encodeKey(bookKey));
    if (!prev) {
      return;
    }

    const rollback = new Map(entriesRef.current);
    const newMap = new Map(entriesRef.current);
    newMap.delete(encodeKey(bookKey));
    setEntries(newMap);

    try {
      await removeFromShelf(uid, bookKey);
      exploreCache.markDirty();

      if (!opts?.silent) {
        const localizedBook = {
          ...prev.book,
          title: prev.book.titles?.[lang] ?? prev.book.title,
        };
        notifyShelfRemoved(localizedBook, prev.status, () =>
          addBook(prev.book, prev.status, { silent: true }),
        );
      }
    } catch {
      setEntries(rollback);
    }
  };

  const getStatus = (bookKey: string) => visibleEntries.get(encodeKey(bookKey))?.status ?? null;

  const getEntry = (bookKey: string): ShelfEntry | null => {
    const entry = visibleEntries.get(encodeKey(bookKey));
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

  const updateProgress = async (
    bookKey: string, 
    currentPage: number, 
    opts?: {
    note?: string;
    rating?: number;
    review?: string;
    status?: ShelfStatus;
    silent?: boolean;
   },
  ) => {
    if (!uid) {
      return;
    }

    const encoded = encodeKey(bookKey);
    const existing = entriesRef.current.get(encoded);
    if (!existing) {
      return;
    }

    const rollback = new Map(entriesRef.current);
    const totalPages = existing.book.pages ?? 0;
    const derivedStatus: ShelfStatus =
      totalPages > 0 && currentPage === totalPages ? "finished" : existing.status;
    const newStatus: ShelfStatus = opts?.status ?? derivedStatus;
    const prevStatus = existing.status;
    const prevPage = existing.currentPage ?? 0;

    const newMap = new Map(entriesRef.current);
    newMap.set(encoded, {
      ...existing,
      currentPage,
      status: newStatus,
      ...(opts?.rating !== undefined && { rating: opts.rating }),
      ...(opts?.review !== undefined && { review: opts.review }),
    });
    setEntries(newMap);

    try {
      await updateReadingProgress(uid, existing, currentPage, opts?.note, opts?.rating, opts?.review);
      exploreCache.markDirty();
      
      if (!opts?.silent) {
        const localizedBook = {
          ...existing.book,
          title: existing.book.titles?.[lang] ?? existing.book.title,
        };
        if (newStatus !== prevStatus && newStatus === "finished") {
          notifyShelfStatusChanged(localizedBook, prevStatus, "finished", () =>
            updateProgress(bookKey, prevPage, {
              status: prevStatus,
              silent: true,
            }),
          );
        } else {
          notifyProgressUpdated(localizedBook, currentPage, totalPages);
        }
      }
    } catch {
      setEntries(rollback);
    }
  };

  const shelfByStatus = useMemo(() => {
    const result: Record<ShelfStatus, Book[]> = {
      wantToRead: [], reading: [], finished: [], didNotFinish: [],
    };
    for (const { book, status } of visibleEntries.values()) {
      result[status].push({
        ...book,
        title: book.titles?.[lang] ?? book.title,
        isbn: book.isbns?.[lang] ?? book.isbn,
      });
    }
    logger.log(result);
    return result;
  }, [visibleEntries, lang]);

  return (
    <ShelfContext.Provider
      value={{ shelfByStatus, loading, addBook, removeBook, getStatus, getEntry, updateProgress }}
    >
      {children}
    </ShelfContext.Provider>
  );
}
