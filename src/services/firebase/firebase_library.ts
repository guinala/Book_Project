import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase_init";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import { logActivity } from "./firebase_activity";

export type ShelfEntry = { book: Book; status: ShelfStatus; currentPage?: number };

export function encodeKey(bookKey: string): string {
  return bookKey.split("/").at(-1) ?? bookKey;
}

export async function addToShelf(
  uid: string,
  book: Book,
  status: ShelfStatus,
  prevStatus?: ShelfStatus | null
): Promise<void> {
  const shelfRef = doc(db, "Users", uid, "Shelf", encodeKey(book.key));
  await setDoc(shelfRef, {
    ...book,
    status,
    addedAt: new Date().toISOString(),
  }, { merge: true });

  if (prevStatus === status) return;

  const base = {
    bookId: book.key,
    bookTitle: book.title,
    bookCoverUrl: book.cover_url,
    bookAuthor: book.authors[0],
  };

  if (status === "wantToRead") {
    logActivity(uid, { type: "watchlist_add", ...base })
      .catch((err) => console.warn("[addToShelf] logActivity failed:", err));
  } else if (status === "reading") {
    logActivity(uid, { type: "reading_started", ...base })
      .catch((err) => console.warn("[addToShelf] logActivity failed:", err));
  } else if (status === "finished") {
    logActivity(uid, { type: "book_finished", ...base })
      .catch((err) => console.warn("[addToShelf] logActivity failed:", err));
  }
}

export async function updateReadingProgress(
  uid: string,
  entry: ShelfEntry,
  currentPage: number,
  note?: string
): Promise<void> {
  const totalPages = entry.book.pages ?? 0;
  const isFinished = totalPages > 0 && currentPage === totalPages;
  const shelfRef = doc(db, "Users", uid, "Shelf", encodeKey(entry.book.key));

  const update: Record<string, unknown> = { currentPage };
  if (isFinished) update.status = "finished";
  await updateDoc(shelfRef, update);

  const base = {
    bookId: entry.book.key,
    bookTitle: entry.book.title,
    bookCoverUrl: entry.book.cover_url,
    bookAuthor: entry.book.authors[0],
  };

  logActivity(uid, { type: "progress", ...base, progress: currentPage, note })
    .catch((err) => console.warn("[updateReadingProgress] logActivity failed:", err));

  if (isFinished) {
    logActivity(uid, { type: "book_finished", ...base })
      .catch((err) => console.warn("[updateReadingProgress] logActivity failed:", err));
  }
}

export async function removeFromShelf(
    uid: string,
    bookKey: string): Promise<void> {
    await deleteDoc(doc(db, "Users", uid, "Shelf", encodeKey(bookKey)));
}

export async function getShelf(uid: string): Promise<ShelfEntry[] | null> {
   const shelf = await getDocs(collection(db, "Users", uid, "Shelf"));

    if (shelf.size <= 0) {
        return null;
    }

    return shelf.docs.map((d) => {
        const data = d.data();
        return {
            book: {
                key: data.key,
                title: data.title,
                authors: data.authors,
                authorKeys: data.authorKeys ?? undefined,
                first_publish_year: data.first_publish_year,
                cover_id: data.cover_id,
                cover_url: data.cover_url ?? undefined,
                edition_count: data.edition_count,
                genre: data.genre ?? undefined,
                rating: data.rating ?? undefined,
                ratingCount: data.ratingCount ?? undefined,
                isbn: data.isbn ?? undefined,
                pages: data.pages ?? undefined,
            } as Book,
            status: data.status as ShelfStatus,
            currentPage: data.currentPage ?? undefined,
        };
    });
}

export async function getBookStatus(
    uid: string,
    bookKey: string): Promise<ShelfStatus | null> {
    const bookDoc = await getDoc(doc(db, "Users", uid, "Shelf", encodeKey(bookKey)));

    if (!bookDoc.exists()) return null;
    return (bookDoc.data().status as ShelfStatus) ?? null;
}
