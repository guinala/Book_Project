import { libraryThingClient } from "./apiConnections";
import { getLangIso3Letters } from "@/utils/langConversion";
import type { LTField, LTWorkCK } from "@/types/LibraryThing";
import { logger } from "@/utils/logger";

const API_KEY = import.meta.env.VITE_LIBRARY_THING_API_KEY as string;
const SYNOPSIS_FIELDS = ['description', 'summary'];

function parseCKResponse(xml: string): LTWorkCK | null {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) return null;

  const fields: LTField[] = Array.from(doc.querySelectorAll('field')).map(field => ({
    name: field.getAttribute('name') ?? '',
    versions: Array.from(field.querySelectorAll('version')).map(version => ({
      language: version.getAttribute('language') ?? '',
      facts: Array.from(version.querySelectorAll('fact')).map(f => f.textContent ?? ''),
    })),
  }));

  return { fields };
}

function pickSynopsis(ck: LTWorkCK, lang: string): string {
  const langIso = getLangIso3Letters(lang); 

  for (const fieldName of SYNOPSIS_FIELDS) {
    const field = ck.fields.find(f => f.name === fieldName);
    if (!field) continue;
    const version = field.versions.find(v => v.language === langIso);
    const fact = version?.facts.find(f => f.trim().length > 0);
    if (fact) return fact.trim();
  }

  return '';
}

export async function fetchLibraryThingSynopsis(
  isbn: string | undefined,
  lang: string,
  signal?: AbortSignal
): Promise<string> {
  if (!isbn || !API_KEY) return '';

  try {
    logger.log("Procede a probarse");
    const { data } = await libraryThingClient.get<string>('/', {
      params: {
        method: 'librarything.ck.getwork',
        isbn,
        apikey: API_KEY,
      },
      responseType: 'text',
      signal,
    });

    const ck = parseCKResponse(data);
    if (!ck) return '';

    const synopsis = pickSynopsis(ck, lang);
    logger.log(`[LT Synopsis] ${lang}/${isbn}:`, synopsis ? `OK (${synopsis.length} chars)` : 'vacío');
    return synopsis;
  } catch (err) {
    logger.log('[LT Synopsis] error', err);
    return '';
  }
}