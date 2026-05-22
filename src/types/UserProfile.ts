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
  followersCount: number;
  followingCount: number;
  birthDate?: string;
  isPublic: boolean;
};

export type UserMinimal = {
  uid: string;
  name: string;
  username: string;
  profilePhotoUrl: string;
};

export type FollowRequest = {
  requesterUid: string;
  createdAt: Timestamp;
  requesterName: string;
  requesterUsername: string;
  requesterPhotoUrl: string;
};

export type ActivityType =
  | "progress"
  | "review"
  | "list_created"
  | "watchlist_add"
  | "book_finished"
  | "reading_started"
  | "book_rated";

export type ActivityEvent = {
  type: ActivityType;
  bookId?: string;
  bookTitle?: string;
  bookCoverUrl?: string;
  bookAuthor?: string;
  rating?: number;
  progress?: number;
  listName?: string;
  note?: string;
};

export type ActivityItem = ActivityEvent & {
  id: string;
  createdAt: Timestamp;
};

export type NotificationType =
  | "follow"
  | "follow_request"
  | "follow_request_accepted";

export type Notification = {
  id: string;
  type: NotificationType;
  actorUid: string;
  actorName: string;
  actorUsername: string;
  actorPhotoUrl: string;
  createdAt: Timestamp;
  read: boolean;
};
