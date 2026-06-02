export type ListBook = {
  key: string;
  title: string;
  authors: string[];
  cover_url?: string;
};

export type BookList = {
  id: string;
  name: string;
  description?: string;
  books: ListBook[];
  createdAt: string;
  updatedAt: string;
};
