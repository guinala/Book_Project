import { logger } from "@/utils/logger";

export async function fetchScrapedSynopsis(title: string, author?: string): Promise<string> {
  const baseUrl = import.meta.env.VITE_SCRAPE_SYNOPSIS_URL;

  const url =
    `${baseUrl}?title=${encodeURIComponent(title)}` +
    `&author=${encodeURIComponent(author ?? "")}`;

  const response = await fetch(url);
  if (!response.ok) return "";

  const data = await response.json();
  logger.log("cosa hecha creo");
  return data.synopsis ?? "";
}
