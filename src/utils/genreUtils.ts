export function genreToI18nKey(genre: string): string {
  return genre
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

// const FANTASY_SUBJECTS = [
//   "Fantasy fiction",
//   "Epic fantasy",
//   "High fantasy",
//   "Dark fantasy",
//   "Magic",
//   "Wizards",
//   "Fairy tales",
// ];
const GENRE_MAP: Record<string, string[]> = {
  "Fantasy":                    ["fantasy", "fantasy fiction", "epic fantasy", "high fantasy", "dark fantasy", "wizards", "fairy tales", "Fiction, fantasy, epic"],
  "Historical Fiction":         ["historical fiction", "historical novel", "history"],
  "Horror":                     ["horror", "horror fiction", "ghost stories", "supernatural fiction"],
  "Humor":                      ["humor", "humour", "comedy", "satire"],
  "Literature":                 ["literature", "literary fiction", "classics"],
  "Magic":                      ["magic", "witchcraft", "sorcery"],
  "Mystery and detective stories": ["mystery", "detective", "mystery fiction", "detective fiction", "crime fiction"],
  "Poetry":                     ["poetry", "poems"],
  "Romance":                    ["romance", "love stories", "romantic fiction"],
  "Science Fiction":            ["science fiction", "sci-fi", "space opera", "cyberpunk"],
  "Short Stories":              ["short stories", "short story"],
  "Thriller":                   ["thriller", "suspense", "espionage fiction"],
  "Young Adult":                ["young adult", "ya fiction", "juvenile fiction"],
  "Drama":                      ["drama"],
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


// export function handleFantasyGenre(subjects: string[] | undefined): string | undefined {
//   if (!subjects || subjects.length === 0) return undefined;

//   const hasFantasy = subjects.some(
//     (s) => s.toLowerCase() === "fantasy"
//   );

//   if (hasFantasy) return "Fantasy";

//   const hasFantasyEquivalent = subjects.some(
//     (s) => FANTASY_SUBJECTS.map(f => f.toLowerCase()).includes(s.toLowerCase())
//   );

//   if (hasFantasyEquivalent) return "Fantasy";

//   return subjects[0];
// }
