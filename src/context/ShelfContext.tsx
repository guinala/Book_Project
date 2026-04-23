import { auth } from "@/services/firebase/firebase_init";
import { addToShelf, encodeKey, getShelf, removeFromShelf, type ShelfEntry } from "@/services/firebase/firebase_library";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { ShelfContext } from "./shelf_init";

export function ShelfProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Map<string, ShelfEntry>>(new Map());
  const [loading, setLoading] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const uid = firebaseUser?.uid;

      if(uid) {
        setUid(uid);
        setLoading(true);
        const shelf = await getShelf(uid);
        const shelfMap = new Map(
            (shelf ?? []).map(e => [encodeKey(e.book.key), e])
        )
        // setUid(uid);
        setEntries(shelfMap);
        setLoading(false);
      }

      else {
        setUid(null);
        setEntries(new Map());
      }
     
    });

    return () => unsubscribe();
  }, []);

  const addBook = async (book: Book, status: ShelfStatus) => {

    if(!uid) {
        return;
    }

    const rollback = new Map(entries);
    const newMap = new Map(entries);
    newMap.set(encodeKey(book.key), { book, status });
    setEntries(newMap);

    try {
       await addToShelf(uid, book, status);
    }
    catch {
        setEntries(rollback);
    }

  };

  const removeBook = async (bookKey: string) => {

    if (!uid) {
        return;
    }

    const rollback = new Map(entries);
    const newMap = new Map(entries);
    newMap.delete(encodeKey(bookKey));
    setEntries(newMap);

    try {
       await removeFromShelf(uid, bookKey);
    }
    catch {
        setEntries(rollback);
    }

  };

  const getStatus = (bookKey: string) => entries.get(encodeKey(bookKey))?.status ?? null;

  const shelfByStatus = useMemo(() => {
    const result: Record<ShelfStatus, Book[]> = {
        wantToRead: [], reading: [], finished: [], didNotFinish: []
    };
    for (const { book, status } of entries.values()) {
        result[status].push(book);
    }
    return result;
  }, [entries]);


  return (
    <ShelfContext.Provider
      value={{ shelfByStatus, loading, addBook, removeBook, getStatus }}
    >
      {children}
    </ShelfContext.Provider>
  );
}