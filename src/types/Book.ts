export type Book = {
  key: string;
  title: string;
  titles?: Record<string, string>; 
  authors: string[];
  authorKeys?: string[];
  first_publish_year: number;
  cover_id: number | null;
  cover_url?: string;
  edition_count: number;
  genre?: string;
  rating?: number;       
  ratingCount?: number;
  isbn?: string;
  isbns?: Record<string, string>; 
  pages?: number;
  shelfCategory?: string;
}