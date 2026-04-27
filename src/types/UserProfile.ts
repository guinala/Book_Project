import type { Timestamp } from "firebase/firestore";

export type FavoriteBook = {
  key: string;
  title: string;
  authors: string[];
  cover_url?: string;
};

export type UserFullProfile = {
  uid: string;
  email: string;
  name: string;
  surname: string;
  username: string;
  bio: string;
  profilePhotoUrl: string;
  bannerImageUrl: string;
  favoriteBooks: FavoriteBook[];
  followersCount: number;
  followingCount: number;
  birthDate?: string;
};

export type UserMinimal = {
  uid: string;
  name: string;
  username: string;
  profilePhotoUrl: string;
};

export type ActivityType =
  | "progress"
  | "review"
  | "list_created"
  | "watchlist_add"
  | "book_finished"
  | "reading_started";

export type ActivityEvent = {
  type: ActivityType;
  bookId?: string;
  bookTitle?: string;
  bookCoverUrl?: string;
  bookAuthor?: string;
  rating?: number;
  progress?: number;
  listName?: string;
};

export type ActivityItem = ActivityEvent & {
  id: string;
  createdAt: Timestamp;
};
