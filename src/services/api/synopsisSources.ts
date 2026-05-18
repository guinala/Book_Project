import { logger } from "@/utils/logger";
import { fetchGoogleSynopsis } from "./googleBooksApi";
import { fetchLibraryThingSynopsis } from "./libraryThingApi";
import { fetchScrapedSynopsis } from "./scraperApi";
import { fetchOpenLibrarySynopsis } from "./openLibraryApi";

const MIN_LENGTH = 30;

async function requireValid(p: Promise<string>): Promise<string> {
  const result = await p;
  if (result.trim().length < MIN_LENGTH) {
    logger.log("Demasiado corto")
    throw new Error('synopsis-too-short');
  }
  return result;
}

export async function fetchSynopsisRace(args: {
  title: string;
  isbn?: string;
  author?: string;
  lang: string;
  signal: AbortSignal;
  workKey?: string;
}): Promise<string> {
  const { title, isbn, author, lang, signal, workKey } = args;

  // try {
  //   return await Promise.any([
  //     requireValid(fetchGoogleSynopsis(title, signal, isbn, author, lang)),
  //     requireValid(fetchLibraryThingSynopsis(isbn, lang, signal)),
  //     requireValid(fetchScrapedSynopsis(title, author)),
  //   ]);
  // } catch (err) {
  //   logger.log('[Synopsis] Ambas fuentes rechazaron:', err);
  //   return ''; // AggregateError
  // }
  const promises: Promise<string>[] = [
    requireValid(fetchGoogleSynopsis(title, signal, isbn, author, lang)),
    requireValid(fetchLibraryThingSynopsis(isbn, lang, signal)),
  ];

  if (lang === 'es') {
    promises.push(requireValid(fetchScrapedSynopsis(title, author)));
  } else if (lang === 'en' && workKey) {
    promises.push(requireValid(fetchOpenLibrarySynopsis(workKey, signal)));
  }

  try {
    return await Promise.any(promises);
  } catch (err) {
    logger.log('[Synopsis] Todas las fuentes rechazaron:', err);
    return '';
  }
}