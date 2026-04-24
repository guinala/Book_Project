export function genreToI18nKey(genre: string): string {
  return genre
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

const FANTASY_SUBJECTS = [
  "Fantasy fiction",
  "Epic fantasy",
  "High fantasy",
  "Dark fantasy",
  "Magic",
  "Wizards",
  "Fairy tales",
];

export function handleFantasyGenre(subjects: string[] | undefined): string | undefined {
  if (!subjects || subjects.length === 0) return undefined;

  const hasFantasy = subjects.some(
    (s) => s.toLowerCase() === "fantasy"
  );

  if (hasFantasy) return "Fantasy";

  const hasFantasyEquivalent = subjects.some(
    (s) => FANTASY_SUBJECTS.map(f => f.toLowerCase()).includes(s.toLowerCase())
  );

  if (hasFantasyEquivalent) return "Fantasy";

  return subjects[0];
}
