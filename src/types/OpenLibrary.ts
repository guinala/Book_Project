export type OpenLibraryEditionDoc = {
  key?: string;
  title?: string;
  language?: string[];
  cover_i?: number;
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
}

export type OpenLibrarySearchResponse = {
  docs: OpenLibraryDoc[];
  numFound: number;
}
