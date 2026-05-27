import { useState } from "react";
import { useNavigate } from "react-router";
import type { Book } from "@/types/Book";
import { resolveCoverSrc } from "@/utils/coverImage";
import { useTranslation } from "react-i18next";
import "./BookCard.scss";
import { encodeKey } from "@/utils/bookPaths";
import { BookOpen, Star } from "lucide-react";
import ShelfDropdownButton from "@/components/book/shelf-dropdown/ShelfDropdownButton";

type BookCardProps = {
  book: Book;
  rank?: number;
};

export default function BookCard({ book, rank }: BookCardProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleCardClick = () => {
    navigate(`/books/${encodeKey(book.key)}`, { state: { book } });
  };

  const hasCover = (book.cover_url || book.cover_id) && !coverFailed;
  const coverSrc = resolveCoverSrc(book) ?? "";
  const rating = book.rating ?? 0;

  return (
    <article
      className={`book-card`}
      onClick={handleCardClick}
    >
      <div className="book-card__cover-wrapper">
        {hasCover ? (
          <img
            className="book-card__cover"
            src={coverSrc}
            alt={t("book.coverAlt", { title: book.title })}
            loading="lazy"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="book-card__cover-placeholder">
            <BookOpen strokeWidth={1.5} />
          </div>
        )}
        {rank && <span className="book-card__rank">{rank}</span>}
      </div>

      <ShelfDropdownButton
        book={book}
        variant="compact"
        classNames={{
          root: "book-card__save-wrapper",
          btn: "book-card__save-btn",
          list: "book-card__dropdown",
          item: "book-card__dropdown-item",
          tooltip: "book-card__tooltip",
          icon: "book-card__save-icon",
        }}
      />

      <div className="book-card__info">
        <div className="book-card__text">
          <h3 className="book-card__title">{book.title}</h3>
          <p className="book-card__author">
            {book.authors.length > 0 ? book.authors.join(", ") : t("book.unknownAuthor")}
          </p>
        </div>
        <div className="book-card__rating">
          <Star className="book-card__star" size={13} fill="currentColor" stroke="none" />
          {rating > 0 ? (
            <>
              <span className="book-card__rating-value">{rating.toFixed(1)}</span>
              {book.ratingCount && (
                <span className="book-card__rating-count">({book.ratingCount.toLocaleString()})</span>
              )}
            </>
          ) : (
            <span className="book-card__rating-count">{t("book.noRating")}</span>
          )}
        </div>
      </div>
    </article>
  );
}
