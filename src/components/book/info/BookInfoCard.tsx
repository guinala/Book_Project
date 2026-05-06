import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { BookDetail, ShelfStatus } from "@/types/BookDetail";
import type { Book } from "@/types/Book";
import StarRating from "@/components/common/StarRating";
import SynopsisModal from "@/components/book/info/SynopsisModal";
import "./BookInfoCard.scss";
import { useShelf } from "@/hooks/useShelf";
import { useAuth } from "@/hooks/useAuth";
import { genreToI18nKey } from "@/utils/genreUtils";
import { Share2, Check, ChevronRight, ChevronDown } from "lucide-react";

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

  const bookForShelf: Book = {
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
  };
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

  const handleShelfSelect = (option: ShelfStatus) => {
    if (saved === option) {
      removeBook(book.key);
    } else {
      addBook(bookForShelf, option);
      setShelfOpen(false);
    }
  };

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
          <Share2 />
        </button>

        <div className="book-info-card__details">
          <span className="book-info-card__genre">
            {book.genre ? t(`book.genres.${genreToI18nKey(book.genre)}`, { defaultValue: book.genre }) : ""}
          </span>
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
                <ChevronDown />
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
                  <Check className="book-info-card__save-check" />
                )}
                {saved ? t(`myLibrary.shelf.${saved}`) : t("bookDetail.saveBook")}
                <ChevronRight className="book-info-card__save-chevron" />
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
                        {saved === opt && <Check size={16} />}
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
