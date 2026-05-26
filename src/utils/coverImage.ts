import type { Book } from "@/types/Book";

export function getCoverUrl(coverId: number): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
}

export function resolveCoverSrc(
  book: Pick<Book, "cover_url" | "cover_id">,
): string | null {
  return book.cover_url ?? (book.cover_id ? getCoverUrl(book.cover_id) : null);
}