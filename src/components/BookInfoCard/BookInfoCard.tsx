import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { BookDetail, ShelfStatus } from "@/types/BookDetail";
import type { Book } from "@/types/Book";
import StarRating from "@/components/StarRating/StarRating";
import SynopsisModal from "@/components/SynopsisModal/SynopsisModal";
import "./BookInfoCard.scss";
import { useShelf } from "@/hooks/useShelf";
import { useAuth } from "@/hooks/useAuth";

const SHELF_OPTIONS: ShelfStatus[] = ["wantToRead", "reading", "finished", "didNotFinish"];

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
  const [shelfOpen, setShelfOpen] = useState(false);
  const { addBook, removeBook, getStatus } = useShelf();
  const saved = getStatus(book.key);

  const bookForShelf = useMemo<Book>(() => ({
    key: book.key,
    title: book.title,
    authors: [book.author],
    first_publish_year: book.year,
    cover_id: null,
    cover_url: book.cover_url,
    edition_count: 0,
    genre: book.genre,
    pages: book.pages,
    isbn: book.isbn,
  }), [book]);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [synopsisOpen, setSynopsisOpen] = useState(false);
  const shelfRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();


  useEffect(() => {
    if (!shelfOpen) return;
    const handler = (e: MouseEvent) => {
      if (shelfRef.current && !shelfRef.current.contains(e.target as Node)) {
        setShelfOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [shelfOpen]);

  const handleShelfSelect = useCallback(
    (option: ShelfStatus) => {
      if(saved === option) {
        removeBook(book.key);
      }
      else {
        addBook(bookForShelf, option);
        setShelfOpen(false);
      }
    },
    [saved, book.key, bookForShelf, addBook, removeBook]
  );

  const handleSaveBtnClick = () => {
    if (!isAuthenticated) {
      setTooltipVisible(true);
      setTimeout(() => setTooltipVisible(false), 2000);
      return;
    }
    setShelfOpen((o) => !o);
  };


  return (
    <>
      {synopsisOpen && (
        <SynopsisModal text={book.synopsis} onClose={() => setSynopsisOpen(false)} />
      )}

      <div className="book-info-card">
        <div className="book-info-card__cover-wrap">
          {/* <img
            className="book-info-card__cover"
            src={book.cover_url}
            alt={t("book.coverAlt", { title: book.title })}
          /> */}
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
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>

        <div className="book-info-card__details">
          <span className="book-info-card__genre">{book.genre}</span>
          <h1 className="book-info-card__title">{book.title}</h1>
          <p className="book-info-card__author">{book.author}</p>

          <div className="book-info-card__info-row">
            <div className="book-info-card__rating-block">
              <span className="book-info-card__rating-number">{parseFloat(book.rating.toFixed(1))}</span>
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
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          </div>

          <div className="book-info-card__footer">
            <div ref={shelfRef} className="book-info-card__save-wrapper">
              {tooltipVisible && (
                <span className="book-info-card__tooltip">
                  {t("explore.saveTooltip")}
                </span>
              )}

              <button
                className={[
                  "book-info-card__save-btn",
                  saved && !shelfOpen ? "book-info-card__save-btn--saved" : "",
                  shelfOpen ? "book-info-card__save-btn--open" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={handleSaveBtnClick}
              >
                {saved && !shelfOpen && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="book-info-card__save-check"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {saved ? t(`myLibrary.shelf.${saved}`) : t("bookDetail.saveBook")}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="book-info-card__save-chevron"
                >
                  <polyline points="9 6 15 12 9 18" />
                </svg>
              </button>

              {shelfOpen && (
                <ul className="book-info-card__dropdown">
                  {SHELF_OPTIONS.map((opt) => (
                    <li key={opt}>
                      <button
                        className={[
                          "book-info-card__dropdown-item",
                          saved === opt ? "book-info-card__dropdown-item--active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => handleShelfSelect(opt)}
                      >
                        {saved === opt && (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {t(`myLibrary.shelf.${opt}`)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
