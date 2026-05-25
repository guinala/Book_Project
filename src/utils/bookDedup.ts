import type { Book } from "@/types/Book";

export function sortByCoverAndRating(books: Book[]): Book[] {
  return [...books].sort((a, b) => {
    if (a.cover_id && !b.cover_id) return -1;
    if (!a.cover_id && b.cover_id) return 1;
    return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
  });
}

export function dedupByNormalizedTitle(books: Book[]): Book[] {
  const seen = new Map<string, Book>();
  for (const book of books) {
    const key = book.title.toLowerCase().trim();
    if (!seen.has(key)) seen.set(key, book);
  }
  return [...seen.values()];
}

export function dedupBestByTitle(books: Book[]): Book[] {
  const isBetter = (a: Book, b: Book) =>
    (!!a.cover_id && !b.cover_id) ||
    (!!a.cover_id === !!b.cover_id && (a.ratingCount ?? 0) > (b.ratingCount ?? 0));
  const bestByTitle = new Map<string, Book>();
  for (const book of books) {
    const key = book.title.toLowerCase().trim();
    const existing = bestByTitle.get(key);
    if (!existing || isBetter(book, existing)) bestByTitle.set(key, book);
  }
  return [...bestByTitle.values()];
}
