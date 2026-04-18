import i18n from "@/plugins/i18n/i18n";
import type { Book } from "@/types/Book";
import type { OLAuthorDoc, OLAuthorWork, OpenLibrarySearchResponse, OpenLibraryWork, WikiSummary } from "@/types/OpenLibrary";
import { openLibraryClient } from "@/services/api/apiConnections";
import { getLangIso3Letters } from "@/utils/langConversion";
import { handleFantasyGenre } from "@/utils/genreUtils";

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
  "isbn",
  "number_of_pages_median",
  "editions",
  "editions.title",
  "editions.language",
  "editions.cover_i",
  "editions.isbn",
].join(",");

const SEARCH_FIELDS = "key,title,author_name,first_publish_year,cover_i,edition_count, isbn, number_of_pages_median";

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
      genre: handleFantasyGenre(doc.subject),
      rating: doc.ratings_average,
      ratingCount: doc.ratings_count,
      isbn: bestEdition?.isbn?.[0] ?? doc.isbn?.[0],
      pages: doc.number_of_pages_median,
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
    isbn: doc.isbn?.[0],
    pages: doc.number_of_pages_median,  
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

export async function getWork(
  workKey: string,
  signal?: AbortSignal
): Promise<OpenLibraryWork> {
  const { data } = await openLibraryClient.get<OpenLibraryWork>(
    `${workKey}.json`,
    { signal }
  );
  return data;
}

export function extractSynopsis(work: OpenLibraryWork): string {
  if (!work.description) return '';
  if (typeof work.description === 'string') return work.description;
  return work.description.value ?? '';
}

export async function searchAuthor(name: string): Promise<OLAuthorDoc | null> {
  const { data } = await openLibraryClient.get<{ docs?: OLAuthorDoc[] }>(
    '/search/authors.json',
    { params: { q: name, limit: 1 } }
  );
  return data.docs?.[0] ?? null;
}

export async function getAuthorWorks(authorKey: string, limit = 10): Promise<OLAuthorWork[]> {
  const { data } = await openLibraryClient.get<{ entries?: OLAuthorWork[] }>(
    `/authors/${authorKey}/works.json`,
    { params: { limit } }
  );
  return data.entries ?? [];
}

export async function fetchAuthorBooks(
  authorName: string,
  lang: string,
  limit: number,
  signal?: AbortSignal
): Promise<Book[]> {
  const langCode = getLangIso3Letters(lang);
  const unknownAuthor = i18n.t("book.unknownAuthor");

  const { data } = await openLibraryClient.get<OpenLibrarySearchResponse>("/search.json", {
    params: {
      q: `author:${authorName} language:${langCode}`,
      lang,
      fields: "key,title,author_name,cover_i,first_publish_year,edition_count,ratings_average,ratings_count,isbn,number_of_pages_median,editions,editions.title,editions.language,editions.cover_i,editions.isbn",
      limit,
    },
    signal,
  });

  return data.docs.map(doc => {
    const bestEdition = doc.editions?.docs?.[0];
    return {
      key: doc.key,
      title: bestEdition?.title ?? doc.title,
      authors: doc.author_name ?? [unknownAuthor],
      first_publish_year: doc.first_publish_year ?? 0,
      cover_id: bestEdition?.cover_i ?? doc.cover_i ?? null,
      edition_count: doc.edition_count ?? 0,
      rating: doc.ratings_average,
      ratingCount: doc.ratings_count,
      isbn: bestEdition?.isbn?.[0] ?? doc.isbn?.[0],
      pages: doc.number_of_pages_median,
    };
  });
}

export async function fetchBooksByGenre(
  genre: string,
  limit: number,
  lang: string,
  signal: AbortSignal
): Promise<Book[]> {
  const langCode = getLangIso3Letters(lang);
  const unknownAuthor = i18n.t("book.unknownAuthor");

  const { data } = await openLibraryClient.get<OpenLibrarySearchResponse>("/search.json", {
    params: {
      q: `subject:${genre} language:${langCode}`,
      lang,
      fields: FANTASY_FIELDS,
      limit,
      sort: "rating desc",
    },
    signal,
  });

  return data.docs.map((doc) => {
    const bestEdition = doc.editions?.docs?.[0];
    return {
      key: doc.key,
      title: bestEdition?.title ?? doc.title,
      authors: doc.author_name ?? [unknownAuthor],
      first_publish_year: doc.first_publish_year ?? 0,
      cover_id: bestEdition?.cover_i ?? doc.cover_i ?? null,
      edition_count: doc.edition_count ?? 0,
      genre,
      rating: doc.ratings_average,
      ratingCount: doc.ratings_count,
      isbn: bestEdition?.isbn?.[0] ?? doc.isbn?.[0],
      pages: doc.number_of_pages_median,
    };
  });
}

export async function getWikipediaSummary(name: string): Promise<WikiSummary | null> {
  const title = encodeURIComponent(name.trim().replace(/ /g, '_'));

  const attempt = async (lang: string): Promise<WikiSummary | null> => {
    try {
      const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${title}`);
      if (!res.ok) return null;
      const data = await res.json() as WikiSummary & { type?: string };
      if (data.type === 'disambiguation') return null;
      return data;
    } catch {
      return null;
    }
  };

  return (await attempt('es')) ?? (await attempt('en'));
}

