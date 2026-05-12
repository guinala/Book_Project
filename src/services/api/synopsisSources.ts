import { fetchGoogleSynopsis } from "./googleBooksApi";
import { fetchLibraryThingSynopsis } from "./libraryThingApi";

const MIN_LENGTH = 50;

async function requireValid(p: Promise<string>): Promise<string> {
  const result = await p;
  if (result.trim().length < MIN_LENGTH) throw new Error('synopsis-too-short');
  return result;
}

export async function fetchSynopsisRace(args: {
  title: string;
  isbn?: string;
  author?: string;
  lang: string;
  signal: AbortSignal;
}): Promise<string> {
  const { title, isbn, author, lang, signal } = args;

  try {
    return await Promise.any([
      requireValid(fetchGoogleSynopsis(title, signal, isbn, author, lang)),
      requireValid(fetchLibraryThingSynopsis(isbn, lang, signal)),
    ]);
  } catch {
    return ''; // AggregateError: ambas rechazaron
  }
}