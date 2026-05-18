import { useState } from "react";
import { useNavigate } from "react-router";
import type { Book } from "@/types/Book";
import { getCoverUrl } from "@/utils/coverImage";
import "./BookTile.scss";
import { encodeKey } from "@/utils/bookPaths";

type BookTileProps = {
  book: Book;
}

export default function BookTile({ book }: BookTileProps) {
  const coverSrc = book.cover_url ?? (book.cover_id ? getCoverUrl(book.cover_id) : null);
  const navigate = useNavigate();
  const [coverLoaded, setCoverLoaded] = useState(false);

  return (
    <article className="book-tile" onClick={() => navigate(`/books/${encodeKey(book.key)}`, { state: { book } })} style={{ cursor: "pointer" }}>
      <div className="book-tile__cover-wrapper">
        {coverSrc ? (
          <>
            {!coverLoaded && <div className="book-tile__cover-skeleton" />}
            <img
              className="book-tile__cover"
              src={coverSrc}
              alt={book.title}
              loading="lazy"
              onLoad={() => setCoverLoaded(true)}
              style={{ opacity: coverLoaded ? 1 : 0 }}
            />
          </>
        ) : (
          <div className="book-tile__cover-placeholder">Portada</div>
        )}
      </div>
      <p className="book-tile__title">{book.title}</p>
      <p className="book-tile__author">{book.authors.length > 0 ? book.authors.join(", ") : ""}</p>
    </article>
  );
}
