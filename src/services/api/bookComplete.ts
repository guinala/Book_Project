import type { Book } from "@/types/Book";
import { fetchWorkEditionByLang } from "@/services/api/openLibraryApi";
import { updateBookTitleToDB } from "@/services/firebase/firebaseBooks";
import { logger } from "@/utils/logger";

/**
 * Para los libros que no tienen título en `lang`, fetcha la edición correspondiente
 * en OpenLibrary y devuelve los libros con título/isbn rellenados.
 * Persiste los nuevos títulos en Firestore en paralelo.
 */
export async function completeBookTitles(books: Book[], lang: string): Promise<Book[]> {
  const missing = books.filter((b) => !b.titles?.[lang]);
  if (missing.length === 0) return books;

  const results = await Promise.all(
    missing.map(async (book) => {
      const edition = await fetchWorkEditionByLang(book.key, lang);
      if (edition) {
        updateBookTitleToDB(book.key, edition.title, lang, edition.isbn).catch((err) =>
          logger.warn("[enrichBookTitles] update failed", err),
        );
      }
      return { key: book.key, edition };
    }),
  );

  const completedMap = new Map(
    results
      .filter((r): r is { key: string; edition: NonNullable<typeof r.edition> } => r.edition !== null)
      .map((r) => [r.key, r.edition]),
  );

  if (completedMap.size === 0) return books;

  return books.map((book) => {
    const completed = completedMap.get(book.key);
    if (!completed) return book;
    return {
      ...book,
      title: completed.title,
      titles: { ...(book.titles ?? {}), [lang]: completed.title },
      ...(completed.isbn ? { isbn: completed.isbn, isbns: { ...(book.isbns ?? {}), [lang]: completed.isbn } } : {}),
    };
  });
}
