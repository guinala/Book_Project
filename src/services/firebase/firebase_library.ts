import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "./firebase_init";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import { logActivity } from "./firebase_activity";

export type ShelfEntry = { book: Book; status: ShelfStatus };

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

export async function removeFromShelf(
    uid: string, 
    bookKey: string): Promise<void>{

    await deleteDoc(doc(db, "Users", uid, "Shelf", encodeKey(bookKey)));
}

export async function getShelf(uid: string): Promise<ShelfEntry[] | null> {
   const shelf = await getDocs(collection(db, "Users", uid, "Shelf"));
    
    if(shelf.size <= 0){
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