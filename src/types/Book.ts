export interface Book {
  key: string;
  title: string;
  authors: string[];
  first_publish_year: number;
  cover_id: number | null;
  edition_count: number;
}
