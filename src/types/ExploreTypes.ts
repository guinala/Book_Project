export type ExploreSectionType =
  | "trending"
  | "top-rated"
  | "fiction"
  | "non-fiction"
  | "new-releases"
  | "quick-reads"
  | "because-reading"
  | "more-genre"
  | "new-releases-for-you"
  | "waiting"
  | "more-author";

export type ExploreSectionParams = {
  referenceBookKey?: string;
  referenceBookTitle?: string;
  referenceGenre?: string;
  favoriteGenre?: string;
  favoriteAuthorKey?: string;
  favoriteAuthorName?: string;
  userAuthorKeys?: string[];
  userShelfKeys?: Set<string>;
  wantToReadBooks?: import("@/types/Book").Book[];
};

export type UseSectionResult = {
  books: import("@/types/Book").Book[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  isFallback: boolean;
};
