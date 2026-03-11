import { useState, useRef } from "react";
import type { MouseEvent } from "react";
import type { Book } from "../../types/Book";
import { getCoverUrl } from "../../utils/coverImage";
import "./BookCard.scss";
import { useTranslation } from "react-i18next";

type BookCardProps = {
  book: Book;
}

function StarRating({ rating }: { rating: number }) {
  const stars = [];
  const clamped = Math.max(0, Math.min(5, rating));

  for (let i = 1; i <= 5; i++) {
    if (clamped >= i) {
      stars.push(<span key={i} className="bookcard__star bookcard__star--full">★</span>);
    } else if (clamped >= i - 0.5) {
      stars.push(<span key={i} className="bookcard__star bookcard__star--half">★</span>);
    } else {
      stars.push(<span key={i} className="bookcard__star bookcard__star--empty">☆</span>);
    }
  }

  return <div className="bookcard__stars">{stars}</div>;
}

export default function BookCard({ book }: BookCardProps) {
  const coverRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState("");
  const { t } = useTranslation();

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!coverRef.current) return;
    const rect = coverRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -15;
    const rotateY = ((x - centerX) / centerX) * 15;
    setTransformStyle(
      `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.04, 1.04, 1.04)`
    );
  };

  const handleMouseLeave = () => {
    setTransformStyle("perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
  };

  const displayRating = book.rating ?? 0;

  return (
    <article className="bookcard">
      <div
        ref={coverRef}
        className="bookcard__cover-wrapper"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ transform: transformStyle }}
      >
        {book.cover_url || book.cover_id ? (
          <img
            className="bookcard__cover"
            src={book.cover_url ?? getCoverUrl(book.cover_id!)}
            alt={t("book.coverAlt", { title: book.title })}
            loading="lazy"
          />
        ) : (
          <div className="bookcard__cover-placeholder">📖</div>
        )}
      </div>

      <div className="bookcard__info">
        {book.genre && (
          <span className="bookcard__genre">{book.genre}</span>
        )}

        <h3 className="bookcard__title">{book.title}</h3>

        <p className="bookcard__author">
          {book.authors.length > 0 ? book.authors.join(", ") : "Autor desconocido"}
        </p>

        <div className="bookcard__rating">
          <StarRating rating={displayRating} />
          <span className="bookcard__rating-value">({displayRating.toFixed(1)})</span>
        </div>
      </div>
    </article>
  );
}