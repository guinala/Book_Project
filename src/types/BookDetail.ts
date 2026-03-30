import type { Book } from "./Book";

export type ShelfStatus = "Quiero leer" | "Leyendo" | "Acabado" | "No acabado";

export type Review = {
  id: string;
  name: string;
  handle: string;
  date: string;
  rating: number;
  text: string;
  likes: number;
  comments: number;
};

export type AuthorBook = {
  id: string;
  cover_url: string;
  title: string;
  year: string;
};

export type AuthorInfo = {
  name: string;
  photoUrl: string;
  bio: string;
  books: AuthorBook[];
};

export type BookDetail = {
  key: string;
  cover_url: string;
  genre: string;
  title: string;
  author: string;
  rating: number;
  reviewCount: number;
  pages: number;
  year: number;
  isbn: string;
  synopsis: string;
  reviews: Review[];
  authorInfo: AuthorInfo;
  recommendations: Book[];
};
