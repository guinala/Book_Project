export type OpenLibraryEditionDoc = {
  key?: string;
  title?: string;
  language?: string[];
  cover_i?: number;
  isbn?: string,
}

export type OpenLibraryEditions = {
  numFound: number;
  docs: OpenLibraryEditionDoc[];
}

export type OpenLibraryDoc = {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  edition_count?: number;
  subject?: string[];
  ratings_average?: number;
  ratings_count?: number;
  editions?: OpenLibraryEditions;
  isbn?: string[];
  number_of_pages_median?: number;
}

export type OpenLibrarySearchResponse = {
  docs: OpenLibraryDoc[];
  numFound: number;
}

export type OpenLibraryWork = {
  title: string;
  description?: string | { type: string; value: string };
  covers?: number[];
  subjects?: string[];
}

export type OLAuthorDoc = {
  key: string;   // e.g. "OL23919A"
  name: string;
}

export type OLAuthorWork = {
  key: string;   // e.g. "/works/OL123W"
  title: string;
  covers?: number[];
  first_publish_year?: number;
}

export type WikiSummary = {
  extract: string;
  thumbnail?: { source: string };
}

