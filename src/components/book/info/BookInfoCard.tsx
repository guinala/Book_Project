import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { BookDetail } from "@/types/BookDetail";
import type { Book } from "@/types/Book";
import StarRating from "@/components/common/StarRating";
import SynopsisModal from "@/components/book/info/SynopsisModal";
import "./BookInfoCard.scss";
import { genreToI18nKey } from "@/utils/genreUtils";
import { Share2, ChevronDown } from "lucide-react";
import ShelfDropdownButton from "@/components/book/shelf-dropdown/ShelfDropdownButton";

function formatCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return (Number.isInteger(k) ? k : k.toFixed(1)) + "K";
  }
  return n.toString();
}

type BookInfoCardProps = {
  book: BookDetail;
};

export default function BookInfoCard({ book }: BookInfoCardProps) {
  const { t } = useTranslation();

  const bookForShelf: Book = {
    key: book.key,
    title: book.title,
    authors: book.author ? [book.author] : [],
    first_publish_year: book.year,
    cover_id: null,
    cover_url: book.cover_url,
    edition_count: 0,
    genre: book.genre,
    pages: book.pages,
    isbn: book.isbn,
  };
  const [synopsisOpen, setSynopsisOpen] = useState(false);

  return (
    <>
      {synopsisOpen && (
        <SynopsisModal text={book.synopsis} onClose={() => setSynopsisOpen(false)} />
      )}

      <div className="book-info-card">
        <div className="book-info-card__cover-wrap">
          {book.cover_url ? (
            <img
              className="book-info-card__cover"
              src={book.cover_url}
              alt={t("book.coverAlt", { title: book.title })}
            />
          ) : (
            <div className="book-info-card__cover-placeholder" />
          )}
          <div className="book-info-card__cover-overlay">
            <span className="book-info-card__cover-overlay-text">{t("bookDetail.viewBook")}</span>
          </div>
        </div>

        <button className="book-info-card__share-btn" aria-label={t("bookDetail.share")}>
          <Share2 />
        </button>

        <div className="book-info-card__details">
          <span className="book-info-card__genre">
            {[book.genre, book.genre2]
              .filter((g): g is string => !!g)
              .map((g) => t(`book.genres.${genreToI18nKey(g)}`, { defaultValue: g }))
              .join(" | ")}
          </span>

          <h2 className="book-info-card__title">{book.title}</h2>
          <p className="book-info-card__author">{book.author}</p>

          <div className="book-info-card__info-row">
            <div className="book-info-card__rating-block">
              <span className="book-info-card__rating-number">{book.rating.toFixed(1)}</span>
              <div className="book-info-card__rating-group">
                <StarRating rating={book.rating} size={15} />
                <span className="book-info-card__rating-count">
                  {t("bookDetail.ratingsCount", { total: formatCount(book.reviewCount) })}
                </span>
              </div>
            </div>

            <div className="book-info-card__divider" />
            <div className="book-info-card__meta-item">
              <span className="book-info-card__meta-label">{t("bookDetail.pages")}</span>
              <span className="book-info-card__meta-value">{book.pages || '-'}</span>
            </div>

            <div className="book-info-card__divider" />
            <div className="book-info-card__meta-item">
              <span className="book-info-card__meta-label">{t("bookDetail.published")}</span>
              <span className="book-info-card__meta-value">{book.year || '-'}</span>
            </div>

            <div className="book-info-card__divider" />
            <div className="book-info-card__meta-item">
              <span className="book-info-card__meta-label">{t("bookDetail.isbn")}</span>
              <span className="book-info-card__meta-value">{book.isbn || '-'}</span>
            </div>
          </div>

          {book.synopsis ? (
            <div className="book-info-card__synopsis">
              <div className="book-info-card__synopsis-text">
                {book.synopsis.split("\n\n").map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <div className="book-info-card__synopsis-gradient">
                <button
                  className="book-info-card__synopsis-expand"
                  onClick={() => setSynopsisOpen(true)}
                >
                  {t("bookDetail.readMore")}
                  <ChevronDown />
                </button>
              </div>
            </div>
          ) : (
            <div className="book-info-card__synopsis-empty">
              <p>No hay sinopsis disponible para este libro</p>
            </div>
          )}

          <div className="book-info-card__footer">
            <ShelfDropdownButton
              book={bookForShelf}
              variant="detail"
              classNames={{
                root: "book-info-card__save-wrapper",
                btn: "book-info-card__save-btn",
                list: "book-info-card__dropdown",
                item: "book-info-card__dropdown-item",
                tooltip: "book-info-card__tooltip",
                icon: "book-info-card__save-check",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
