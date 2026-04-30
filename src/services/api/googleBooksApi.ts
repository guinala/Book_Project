import i18n from "@/plugins/i18n/i18n";
import type { Book } from "@/types/Book";
import type { GoogleBooksImageLinks, GoogleBooksResponse } from "@/types/GoogleBooks";
import { googleBooksClient } from "@/services/api/apiConnections";
import axios from "axios";
import { logger } from "@/utils/logger";

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
  const query = `intitle:${title}${author ? `+inauthor:${author}` : ""}`;

  const { data } = await googleBooksClient.get<GoogleBooksResponse>("/volumes", {
    params: {
      q: query,
      maxResults: 1,
      fields: 'items(volumeInfo/imageLinks)',
      key: API_KEY,
    },
    signal,
  });

  return normalizeCoverUrl(data.items?.[0]?.volumeInfo?.imageLinks) ?? null;
}


// export async function fetchGoogleCovers(
//   books: Book[],
//   signal: AbortSignal
// ): Promise<(string | null)[]> {
//   const covers: (string | null)[] = [];

//   for (const book of books) {
//     try {
//       const cover = await fetchGoogleCover(book.title, book.authors[0] ?? "", signal);
//       covers.push(cover);
//     } catch (err) {
//       if (axios.isCancel(err)) throw err;
//       if (axios.isAxiosError(err) && err.response?.status === 503) throw err;
//       covers.push(null);
//     }
//     if (covers.length < books.length) {
//       await new Promise(resolve => setTimeout(resolve, 100));
//     }
//   }

//   return covers;
// }

// Nueva función privada con retry por libro
async function fetchGoogleCoverWithRetry(
  title: string,
  author: string,
  signal: AbortSignal,
  maxRetries = 3
): Promise<string | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchGoogleCover(title, author, signal);
    } catch (err) {
      if (axios.isCancel(err)) throw err;
      if (axios.isAxiosError(err) && err.response?.status === 503) {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 500; 
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        return null; // Se han agotado los intentos
      }
      return null;
    }
  }
  return null;
}

// export async function fetchGoogleCovers(
//   books: Book[],
//   signal: AbortSignal
// ): Promise<(string | null)[]> {
//   const covers: (string | null)[] = [];

//   for (const book of books) {
//     const cover = await fetchGoogleCoverWithRetry(book.title, book.authors[0] ?? "", signal);
//     covers.push(cover);
//     if (covers.length < books.length) {
//       await new Promise(resolve => setTimeout(resolve, 100)); 
//     }
//   }

//   return covers;
// }

export async function fetchGoogleCovers(
  books: Book[],
  signal: AbortSignal,
  onCoverReady?: (index: number, url: string) => void
): Promise<void> {
  const GROUP_SIZE = 3;
  const DELAY = 200;

  for (let i = 0; i < books.length; i += GROUP_SIZE) {
    const batch = books.slice(i, i + GROUP_SIZE);

    await Promise.all(
      batch.map(async (book, batchIndex) => {
        const index = i + batchIndex;
        const cover = await fetchGoogleCoverWithRetry(book.title, book.authors[0] ?? "", signal);
        if (cover && onCoverReady) {
          onCoverReady(index, cover);
        }
      })
    );

    if (i + GROUP_SIZE < books.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY));
    }
  }
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
    cover_url: normalizeCoverUrl(item.volumeInfo.imageLinks) ?? undefined,
    edition_count: 0,
  }));
}

export async function fetchGoogleSynopsis(
  title: string,
  signal: AbortSignal,
  isbn?: string,
  author?: string,
  lang = 'es',
): Promise<string> {
  try {
    const titleAuthorQuery = author ? `intitle:${title}+inauthor:${author}` : `intitle:${title}`;

    // Intento 1: ISBN de la edición española
    if (isbn) {
      const { data } = await googleBooksClient.get<GoogleBooksResponse>("/volumes", {
        params: {
          q: `isbn:${isbn}`,
          maxResults: 1,
          fields: 'items(volumeInfo/description,searchInfo/textSnippet)',
          key: API_KEY,
        },
        signal,
      });
      const synopsis = extractDescription(data);
      logger.log('[Synopsis] Intento 1 (ISBN):', synopsis ? `OK (${synopsis.length} chars)` : 'vacío');
      if (synopsis.trim().length > 50) return synopsis;
    }

    // Intento 2: título+autor en idioma actual
    const { data: data2 } = await googleBooksClient.get<GoogleBooksResponse>("/volumes", {
      params: {
        q: titleAuthorQuery,
        langRestrict: lang,
        maxResults: 1,
        fields: 'items(volumeInfo/description,searchInfo/textSnippet)',
        key: API_KEY,
      },
      signal,
    });
    const synopsis2 = extractDescription(data2);
    logger.log(`[Synopsis] Intento 2 (título+autor ${lang.toUpperCase()}):`, synopsis2 ? `OK (${synopsis2.length} chars)` : 'vacío');
    if (synopsis2.trim().length > 50) return synopsis2;

    // Intento 3: título+autor sin restricción de idioma
    const { data: data3 } = await googleBooksClient.get<GoogleBooksResponse>("/volumes", {
      params: {
        q: titleAuthorQuery,
        maxResults: 1,
        fields: 'items(volumeInfo/description,searchInfo/textSnippet)',
        key: API_KEY,
      },
      signal,
    });
    const synopsis3 = extractDescription(data3);
    logger.log('[Synopsis] Intento 3 (título+autor sin idioma):', synopsis3 ? `OK (${synopsis3.length} chars)` : 'vacío');
    return synopsis3;

  } catch (err) {
    console.error('[Synopsis] Error inesperado — se cortó el flujo:', err);
    return '';
  }
}

function extractDescription(data: GoogleBooksResponse): string {
  const item = data.items?.[0];
  return item?.volumeInfo?.description ?? item?.searchInfo?.textSnippet ?? '';
}


