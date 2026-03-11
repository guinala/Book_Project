import i18n from "../plugins/i18n/i18n";
import type { Book } from "../types/Book";
import type { OpenLibraryDoc } from "../types/OpenLibrary";

export function mapOpenLibraryDoc(doc: OpenLibraryDoc): Book {
  const unknownAuthor = i18n.t("book.unknownAuthor");
  return {
    key: doc.key,
    title: doc.title,
    authors: doc.author_name ?? [unknownAuthor],
    first_publish_year: doc.first_publish_year ?? 0,
    cover_id: doc.cover_i ?? null,
    edition_count: doc.edition_count ?? 0,
  };
}
