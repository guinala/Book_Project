const DEFAULT_MIN_LENGTH = 2;

const STOPWORDS = new Set([
  // español
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del",
  "y", "e", "o", "u", "a", "en", "con", "por", "para", "al", "lo",
  "su", "sus", "se", "que",
  // inglés
  "the", "an", "of", "and", "or", "to", "in", "on", "for", "with", "at", "by",
]);

export function normalizeTitleForSearch(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function buildTitleTokens(
  title: string,
  options?: { minLength?: number; stopWords?: Set<string> }
): string[] {
  const minLength = options?.minLength ?? DEFAULT_MIN_LENGTH;
  const stopWords = options?.stopWords ?? STOPWORDS;
  const words = normalizeTitleForSearch(title).split(/\s+/).filter(Boolean);
  const tokens: string[] = [];
  for (const word of words) {
    if (word.length < minLength) continue;
    if (stopWords?.has(word)) continue;
    tokens.push(word);
  }
  return [...new Set(tokens)];
}

// Se construye un map por cada idioma
export function buildTitleTokensMap(
  titles: Record<string, string> | undefined,
  legacyTitle?: string,
  langs?: string[]
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const safeTitles = titles ?? {};

  for (const [lang, title] of Object.entries(safeTitles)) {
    if (typeof title === "string" && title.trim()) {
      result[lang] = buildTitleTokens(title);
    }
  }

  if (legacyTitle && legacyTitle.trim()) {
    const fallbackTokens = buildTitleTokens(legacyTitle);
    const targetLangs = langs && langs.length > 0 ? langs : ["es"];
    for (const lang of targetLangs) {
      if (!result[lang]) result[lang] = fallbackTokens;
    }
  }

  return result;
}

export function isTitleTokensUpToDate(
  current: Record<string, string[]> | undefined,
  expected: Record<string, string[]>
): boolean {
  if (!current) return Object.keys(expected).length === 0;

  const currentLangs = Object.keys(current);
  const expectedLangs = Object.keys(expected);
  if (currentLangs.length !== expectedLangs.length) return false;

  for (const lang of expectedLangs) {
    const a = current[lang];
    const b = expected[lang];
    if (!a || a.length !== b.length) return false;
    const setA = new Set(a);
    for (const token of b) {
      if (!setA.has(token)) return false;
    }
  }
  return true;
}

// Authors
export function buildAuthorTokens(authors: string[]): string[] {
  const tokens = new Set<string>();
  for (const name of authors ?? []) {
    for (const token of buildTitleTokens(name)) {
      tokens.add(token);
    }
  }
  return [...tokens];
}

export function isAuthorTokensUpToDate(
  current: string[] | undefined,
  expected: string[]
): boolean {
  if (!current) return expected.length === 0;
  if (current.length !== expected.length) return false;
  const set = new Set(current);
  return expected.every((t) => set.has(t));
}

