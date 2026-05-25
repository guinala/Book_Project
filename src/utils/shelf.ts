import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import type { ShelfEntry } from "@/services/firebase/firebaseLibrary";

export function localizeBook(book: Book, lang: string): Book {
  return {
    ...book,
    title: book.titles?.[lang] ?? book.titles?.es ?? book.titles?.en ?? book.title ?? "",
    isbn: book.isbns?.[lang] ?? book.isbns?.es ?? book.isbns?.en ?? book.isbn,
  };
}

export function groupShelfByStatus(
  entries: Iterable<ShelfEntry>,
  lang: string,
): Record<ShelfStatus, Book[]> {
  const result: Record<ShelfStatus, Book[]> = {
    wantToRead: [], reading: [], finished: [], didNotFinish: [],
  };
  for (const { book, status } of entries) {
    result[status].push(localizeBook(book, lang));
  }
  return result;
}
