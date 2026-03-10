import type { Book } from "../../types/Book";
import "./ShelfBookCard.scss";

interface ShelfBookCardProps {
  book: Book;
}

function getCoverUrl(coverId: number): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
}

export default function ShelfBookCard({ book }: ShelfBookCardProps) {
  const coverSrc = book.cover_url ?? (book.cover_id ? getCoverUrl(book.cover_id) : null);

  return (
    <article className="shelf-book">
      <div className="shelf-book__cover-wrapper">
        {coverSrc ? (
          <img
            className="shelf-book__cover"
            src={coverSrc}
            alt={book.title}
            loading="lazy"
          />
        ) : (
          <div className="shelf-book__cover-placeholder">Portada</div>
        )}
      </div>
      <p className="shelf-book__title">{book.title}</p>
      <p className="shelf-book__author">
        {book.authors.length > 0 ? book.authors.join(", ") : ""}
      </p>
    </article>
  );
}