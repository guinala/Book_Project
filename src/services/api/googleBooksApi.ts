import i18n from "../../plugins/i18n/i18n";
import type { Book } from "../../types/Book";
import type { GoogleBooksImageLinks, GoogleBooksResponse } from "../../types/GoogleBooks";
import { googleBooksClient } from "./apiConnections";

const API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string;

function normalizeCoverUrl(imageLinks?: GoogleBooksImageLinks): string | null {
  const url = imageLinks?.thumbnail;
  if (!url) return null;
  return url.replace("http://", "https://");
}

function extractYear(dateStr?: string): number {
  if (!dateStr) return 0;
  return parseInt(dateStr.split("-")[0], 10) || 0;
}

export async function fetchGoogleCover(
  title: string,
  author: string,
  signal: AbortSignal
): Promise<string | null> {
  try {
    const query = `intitle:${title}${author ? `+inauthor:${author}` : ""}`;

    const { data } = await googleBooksClient.get<GoogleBooksResponse>("/volumes", {
      params: {
        q: query,
        maxResults: 1,
        fields: "items(volumeInfo/imageLinks)",
        key: API_KEY,
      },
      signal,
    });

    return normalizeCoverUrl(data.items?.[0]?.volumeInfo?.imageLinks) ?? null;
  } catch {
    return null;
  }
}

export async function fetchGoogleCovers(
  books: Book[],
  signal: AbortSignal
): Promise<(string | null)[]> {
  const promises = books.map((book) =>
    fetchGoogleCover(book.title, book.authors[0] ?? "", signal)
  );

  const results = await Promise.allSettled(promises);

  return results.map((result) =>
    result.status === "fulfilled" ? result.value : null
  );
}

export async function fetchFantasyBooksGoogle(
  limit: number,
  lang: string,
  signal: AbortSignal
): Promise<Book[]> {
  const unknownAuthor = i18n.t("book.unknownAuthor");

  const { data } = await googleBooksClient.get<GoogleBooksResponse>("/volumes", {
    params: {
      q: "subject:fantasy",
      langRestrict: lang,
      maxResults: Math.min(limit, 40),
      orderBy: "relevance",
      printType: "books",
      key: API_KEY,
    },
    signal,
  });

  if (!data.items || data.items.length === 0) return [];

  return data.items.map((item) => ({
    key: item.id,
    title: item.volumeInfo.title,
    authors: item.volumeInfo.authors ?? [unknownAuthor],
    first_publish_year: extractYear(item.volumeInfo.publishedDate),
    cover_id: null,
    cover_url: normalizeCoverUrl(item.volumeInfo.imageLinks),
    edition_count: 0,
  }));
}