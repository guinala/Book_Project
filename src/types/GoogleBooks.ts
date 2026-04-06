export type GoogleBooksImageLinks = {
  thumbnail?: string;
  smallThumbnail?: string;
}

export type GoogleBooksVolumeInfo = {
  title: string;
  authors?: string[];
  publishedDate?: string;
  imageLinks?: GoogleBooksImageLinks;
  description?: string;
}

export type GoogleBooksItem = {
  id: string;
  volumeInfo: GoogleBooksVolumeInfo;
  searchInfo?: { textSnippet?: string};
}

export type GoogleBooksResponse = {
  items?: GoogleBooksItem[];
  totalItems: number;
}
