export type Book = {
  key: string;
  title: string;
  authors: string[];
  first_publish_year: number;
  cover_id: number | null;
  cover_url?: string;
  edition_count: number;
  genre?: string;
  rating?: number;       // 0 – 5
  ratingCount?: number;
}