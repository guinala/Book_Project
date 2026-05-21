export type ExploreSectionType =
  | "trending"
  | "acclaimed"
  | "top-rated"
  | "because-reading"
  | "because-liked"
  | "because-finished"
  | "because-favorites"
  | "more-genre"
  | "more-author"
  | "new-releases-for-you"
  | "waiting"
  | "genre-grid"
  | "top-genre";

export type ExploreSectionParams = {
  referenceBookKey?: string;
  referenceBookTitle?: string;
  referenceGenre?: string;
  favoriteGenre?: string;
  favoriteGenreLabel?: string;
  favoriteAuthorKey?: string;
  favoriteAuthorName?: string;
  userAuthorKeys?: string[];
  userShelfKeys?: Set<string>;
  wantToReadBooks?: import("@/types/Book").Book[];
  favoritesReferenceBook?: import("@/types/Book").Book;
};

export type UseSectionResult = {
  books: import("@/types/Book").Book[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  isFallback: boolean;
};
