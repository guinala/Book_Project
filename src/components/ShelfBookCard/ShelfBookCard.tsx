import { useNavigate } from "react-router";
import type { Book } from "@/types/Book";
import { getCoverUrl } from "@/utils/coverImage";
import "./ShelfBookCard.scss";

type ShelfBookCardProps = {
  book: Book;
}

export default function ShelfBookCard({ book }: ShelfBookCardProps) {
  const coverSrc = book.cover_url ?? (book.cover_id ? getCoverUrl(book.cover_id) : null);
  const navigate = useNavigate();

  return (
    <article className="shelf-book" onClick={() => navigate(`/book/${encodeURIComponent(book.key)}`, { state: { book } })} style={{ cursor: "pointer" }}>
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
      <p className="shelf-book__author">{book.authors.length > 0 ? book.authors.join(", ") : ""}</p>
    </article>
  );
}
