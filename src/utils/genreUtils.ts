export function genreToI18nKey(genre: string): string {
  return genre
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

const GENRE_MAP: Record<string, string[]> = {
  "Fantasy":                    ["fantasy", "fantasy fiction", "epic fantasy", "high fantasy", "dark fantasy", "wizards", "fairy tales", "Fiction, fantasy, epic", "magic", "witchcraft", "sorcery"],
  "Science Fiction":            ["science fiction", "sci-fi", "space opera", "cyberpunk"],
  "Historical Fiction":         ["historical fiction", "historical novel", "history"],
  "Horror":                     ["horror", "horror fiction", "ghost stories", "supernatural fiction"],
  "Humor":                      ["humor", "humour", "comedy", "satire"],
  "Mystery and detective stories": ["mystery", "detective", "mystery fiction", "detective fiction", "crime fiction"],
  "Romance":                    ["romance", "love stories", "romantic fiction"],
  "Thriller":                   ["thriller", "suspense", "espionage fiction"],
  "Drama":                      ["drama"],
  "Young Adult":                ["young adult", "ya fiction", "juvenile fiction"],
  "Short Stories":              ["short stories", "short story"],
  "Poetry":                     ["poetry", "poems"],
  "Literature":                 ["literature", "literary fiction", "classics"],
  "Plays":                      ["plays", "theatre"],
};

export function detectGenre(subjects: string[] | undefined): string | undefined {
  if (!subjects || subjects.length === 0) return undefined;

  for (const subject of subjects) {
    const lower = subject.toLowerCase();
    for (const [genre, keywords] of Object.entries(GENRE_MAP)) {
      if (keywords.includes(lower)) return genre;
    }
  }

  // Fallback
  const fiction = subjects.some(s => s.toLowerCase() === "fiction");
  return fiction ? "Fiction" : "Non-Fiction";
}

export function detectGenres(subjects: string[] | undefined): string[] {
  if (!subjects || subjects.length === 0) return [];

  const found: string[] = [];
  for (const subject of subjects) {
    const lower = subject.toLowerCase();
    for (const [genre, keywords] of Object.entries(GENRE_MAP)) {
      if (keywords.includes(lower) && !found.includes(genre)) {
        found.push(genre);
        if (found.length === 2) return found;
      }
    }
  }

  if (found.length > 0) return found;

  // Fallback
  const fiction = subjects.some((s) => s.toLowerCase() === "fiction");
  return [fiction ? "Fiction" : "Non-Fiction"];
}

export function genreFieldsFromSubjects(subjects: string[] | undefined): {
  genre: string | undefined;
  genre2: string | undefined;
  topics: string[];
} {
  const genres = detectGenres(subjects);
  return {
    genre: genres[0],
    genre2: genres[1],
    topics: subjects ?? [],
  };
}

const GENRE_COLOR_MAP: Record<string, string> = {
  "Fiction": "var(--color-genre-fiction)",
  "Non-Fiction": "var(--color-genre-nonfiction)",
  "Mystery and detective stories": "var(--color-genre-mystery)",
  "Romance": "var(--color-genre-romance)",
  "Science Fiction": "var(--color-genre-scifi)",
  "Historical Fiction": "var(--color-genre-historical)",
  "Fantasy": "var(--color-genre-fiction)",
  "Thriller": "var(--color-genre-mystery)",
};

export function genreToColorVar(genre: string): string {
  return GENRE_COLOR_MAP[genre] ?? "var(--color-genre-default)";
}

const MORE_GENRE_TITLE_KEYS: Record<string, string> = {
  "Fiction":                       "explore.sections.moreGenreFiction",
  "Non-Fiction":                   "explore.sections.moreGenreNonFiction",
  "Mystery and detective stories": "explore.sections.moreGenreMystery",
  "Romance":                       "explore.sections.moreGenreRomance",
  "Science Fiction":               "explore.sections.moreGenreSciFi",
  "Historical Fiction":            "explore.sections.moreGenreHistoricalFiction",
  "Fantasy":                       "explore.sections.moreGenreFantasy",
  "Thriller":                      "explore.sections.moreGenreThriller",
};

export function moreGenreTitleKey(genre: string | undefined): string {
  return (genre && MORE_GENRE_TITLE_KEYS[genre]) ?? "explore.sections.moreGenre";
}
