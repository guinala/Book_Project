import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseInit";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import { deleteActivitiesByTypeAndBook, deleteProgressActivitiesAbove, logActivity } from "./firebaseActivity";
import { incrementBookAddCount } from "./firebaseBooks";

export type ShelfEntry = { 
  book: Book; 
  status: ShelfStatus; 
  currentPage?: number;
  rating?: number;
  review?: string; 
};

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
  const { titles, isbns, ...bookData } = book;
  await setDoc(shelfRef, {
    ...bookData,
    status,
    addedAt: new Date().toISOString(),
  }, { merge: true });

  // Escribir titles/isbns con dot-notation para mantener otros idiomas
  if (titles && Object.keys(titles).length > 0) {
    const langUpdates: Record<string, string> = {};
    for (const [lang, t] of Object.entries(titles)) {
      langUpdates[`titles.${lang}`] = t;
    }
    if (isbns) {
      for (const [lang, isbn] of Object.entries(isbns)) {
        langUpdates[`isbns.${lang}`] = isbn;
      }
    }
    await updateDoc(shelfRef, langUpdates);
  }

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
    deleteActivitiesByTypeAndBook(uid, "watchlist_add", book.key)
      .catch((err) => console.warn("[addToShelf] deleteWatchlistAdd failed:", err));
    logActivity(uid, { type: "reading_started", ...base })
      .catch((err) => console.warn("[addToShelf] logActivity failed:", err));
  } else if (status === "finished") {
    logActivity(uid, { type: "book_finished", ...base })
      .catch((err) => console.warn("[addToShelf] logActivity failed:", err));
  }

  incrementBookAddCount(book.key)
    .catch((err) => console.warn("[addToShelf] incrementTrending failed:", err));
}

export async function updateReadingProgress(
  uid: string,
  entry: ShelfEntry,
  currentPage: number,
  note?: string,
  rating?: number,
  review?: string
): Promise<void> {
  const totalPages = entry.book.pages ?? 0;
  const isFinished = totalPages > 0 && currentPage === totalPages;
  const shelfRef = doc(db, "Users", uid, "Shelf", encodeKey(entry.book.key));

  const update: Record<string, unknown> = { currentPage };
  if (isFinished) {
    update.status = "finished";
    if (rating !== undefined) {
      update.rating = rating;
    }
    if (review !== undefined) {
      update.review = review;
    }
  }
  await updateDoc(shelfRef, update);

  const base = {
    bookId: entry.book.key,
    bookTitle: entry.book.title,
    bookCoverUrl: entry.book.cover_url,
    bookAuthor: entry.book.authors[0],
  };

  const prevPage = entry.currentPage ?? 0;
  const pageChanged = currentPage !== prevPage;
  if (pageChanged) {
    if (currentPage > prevPage) {
      logActivity(uid, { type: "progress", ...base, progress: currentPage, ...(note !== undefined && { note }) })
        .catch((err) => console.warn("[updateReadingProgress] logActivity failed:", err));
    } else {
      deleteProgressActivitiesAbove(uid, entry.book.key, currentPage)
        .catch((err) => console.warn("[updateReadingProgress] deleteProgressActivities failed:", err));
    }
  }

  if (isFinished) {
    logActivity(uid, { type: "book_finished", ...base })
      .catch((err) => console.warn("[updateReadingProgress] logActivity failed:", err));
    
    if (rating !== undefined) {
      logActivity(uid, { type: "book_rated", ...base, rating, ...(review !== undefined && { note: review }) })
        .catch((err) => console.warn("[updateReadingProgress] logActivity failed:", err));
    }
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
              title: data.titles?.es ?? data.titles?.en ?? data.title ?? "",
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
              isbns: data.isbns ?? undefined,
              pages: data.pages ?? undefined,
              titles: data.titles ?? {},
          } as Book,
          status: data.status as ShelfStatus,
          currentPage: data.currentPage ?? undefined,
          rating: data.rating ?? undefined,
          review: data.review ?? undefined,
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

export async function updateShelfBookTitleToDB(
  uid: string,
  bookKey: string,
  title: string,
  lang: string,
  isbn?: string,
): Promise<void> {
  const shelfRef = doc(db, "Users", uid, "Shelf", encodeKey(bookKey));
  const update: Record<string, string> = { [`titles.${lang}`]: title };
  if (isbn) update[`isbns.${lang}`] = isbn;
  await updateDoc(shelfRef, update);
}
