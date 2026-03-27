import i18n from "@/plugins/i18n/i18n";
import type { Book } from "@/types/Book";
import type { OpenLibrarySearchResponse } from "@/types/OpenLibrary";
import { openLibraryClient } from "@/services/api/apiConnections";
import { getLangIso3Letters } from "@/utils/langConversion";

const FANTASY_FIELDS = [
  "key",
  "title",
  "author_name",
  "first_publish_year",
  "cover_i",
  "edition_count",
  "subject",
  "ratings_average",
  "ratings_count",
  "editions",
  "editions.title",
  "editions.language",
  "editions.cover_i",
].join(",");

const SEARCH_FIELDS = "key,title,author_name,first_publish_year,cover_i,edition_count";

export async function fetchFantasyBooks(
  limit: number,
  lang: string,
  signal: AbortSignal
): Promise<Book[]> {
  const langCode = getLangIso3Letters(lang);
  const unknownAuthor = i18n.t("book.unknownAuthor");

  const { data } = await openLibraryClient.get<OpenLibrarySearchResponse>("/search.json", {
    params: {
      q: `subject:fantasy language:${langCode}`,
      lang,
      fields: FANTASY_FIELDS,
      limit,
    },
    signal,
  });

  return data.docs.map((doc) => {
    const bestEdition = doc.editions?.docs?.[0];
    const title = bestEdition?.title ?? doc.title;
    const cover_id = bestEdition?.cover_i ?? doc.cover_i ?? null;

    return {
      key: doc.key,
      title,
      authors: doc.author_name ?? [unknownAuthor],
      first_publish_year: doc.first_publish_year ?? 0,
      cover_id,
      edition_count: doc.edition_count ?? 0,
      genre: doc.subject?.[0],
      rating: doc.ratings_average,
      ratingCount: doc.ratings_count,
    };
  });
}

export async function searchBooks(
  params: Record<string, string>,
  limit: number,
  lang: string,
  signal: AbortSignal
): Promise<{ books: Book[]; totalResults: number }> {
  const unknownAuthor = i18n.t("book.unknownAuthor");

  const { data } = await openLibraryClient.get<OpenLibrarySearchResponse>("/search.json", {
    params: {
      ...params,
      fields: SEARCH_FIELDS,
      limit,
      lang,
    },
    signal,
  });

  const books: Book[] = data.docs.map((doc) => ({
    key: doc.key,
    title: doc.title,
    authors: doc.author_name ?? [unknownAuthor],
    first_publish_year: doc.first_publish_year ?? 0,
    cover_id: doc.cover_i ?? null,
    edition_count: doc.edition_count ?? 0,
  }));

  return { books, totalResults: data.numFound };
}

export async function fetchBookByTitle(
  title: string,
  lang: string,
  signal: AbortSignal
): Promise<Book | null> {
  const unknownAuthor = i18n.t("book.unknownAuthor");

  const { data } = await openLibraryClient.get<OpenLibrarySearchResponse>("/search.json", {
    params: {
      title: title.trim(),
      fields: FANTASY_FIELDS,
      limit: 1,
      lang,
    },
    signal,
  });

  if (!data.docs || data.docs.length === 0) return null;

  const doc = data.docs[0];
  const bestEdition = doc.editions?.docs?.[0];
  const bookTitle = bestEdition?.title ?? doc.title;
  const cover_id = bestEdition?.cover_i ?? doc.cover_i ?? null;

  return {
    key: doc.key,
    title: bookTitle,
    authors: doc.author_name ?? [unknownAuthor],
    first_publish_year: doc.first_publish_year ?? 0,
    cover_id,
    edition_count: doc.edition_count ?? 0,
    genre: doc.subject?.[0],
    rating: doc.ratings_average,
    ratingCount: doc.ratings_count,
  };
}