import type { SearchFilter } from "@/types/Search";

export function getSearchParams(
  query: string,
  filter: SearchFilter
): Record<string, string> {
  switch (filter) {
    case "titulo":
      return { title: query };
    case "autor":
      return { author: query };
    case "isbn":
      return { isbn: query.replace(/-/g, "") };
    case "todo":
    default:
      return { q: query };
  }
}