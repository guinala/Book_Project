export type GoogleBooksImageLinks = {
  thumbnail?: string;
  smallThumbnail?: string;
}

export type GoogleBooksVolumeInfo = {
  title: string;
  authors?: string[];
  publishedDate?: string;
  imageLinks?: GoogleBooksImageLinks;
}

export type GoogleBooksItem = {
  id: string;
  volumeInfo: GoogleBooksVolumeInfo;
}

export type GoogleBooksResponse = {
  items?: GoogleBooksItem[];
  totalItems: number;
}
