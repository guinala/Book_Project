import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import { getCoverUrl } from "@/utils/coverImage";
import { useTranslation } from "react-i18next";
import "./BookCard.scss";
import { useShelf } from "@/hooks/useShelf";
import { useAuth } from "@/hooks/useAuth";
import { encodeKey } from "@/utils/bookPaths";

const SHELF_OPTIONS: ShelfStatus[] = ["wantToRead", "reading", "finished", "didNotFinish"];

type BookCardProps = {
  book: Book;
  rank?: number;
};

export default function BookCard({ book, rank }: BookCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const { addBook, removeBook, getStatus } = useShelf();
  const { isAuthenticated } = useAuth();
  const saved = getStatus(book.key);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const handleCardClick = () => {
    navigate(`/books/${encodeKey(book.key)}`, { state: { book } });
  };

  const handleSaveBtnClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setTooltipVisible(true);
      setTimeout(() => setTooltipVisible(false), 2000);
      return;
    }
    setDropdownOpen((o) => !o);
  };

  const handleSelect = (e: React.MouseEvent, option: ShelfStatus) => {
    e.stopPropagation();
    if (saved === option) {
      removeBook(book.key);
    } else {
      addBook(book, option);
    }
    setDropdownOpen(false);
  };

  const hasCover = (book.cover_url || book.cover_id) && !coverFailed;
  const coverSrc = book.cover_url ?? (book.cover_id ? getCoverUrl(book.cover_id) : "");

  return (
    <article
      className={`book-card${dropdownOpen ? " book-card--open" : ""}`}
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
        )}
        {rank && <span className="book-card__rank">{rank}</span>}
      </div>

      <div className="book-card__save-wrapper" ref={wrapperRef}>
        {tooltipVisible && (
          <span className="book-card__tooltip">
            {t("explore.saveTooltip")}
          </span>
        )}

        <button
          className={`book-card__save-btn${dropdownOpen ? " book-card__save-btn--open" : ""}${saved && !dropdownOpen ? " book-card__save-btn--saved" : ""}`}
          onClick={handleSaveBtnClick}
          aria-label="Guardar libro"
        >
          {saved && !dropdownOpen ? (
            <svg className="book-card__save-icon" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M5 3a2 2 0 0 0-2 2v16l9-6 9 6V5a2 2 0 0 0-2-2H5z"/>
            </svg>
          ) : (
            <svg className={`book-card__save-icon${dropdownOpen ? " book-card__save-icon--open" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          )}
        </button>

        {dropdownOpen && (
          <ul className="book-card__dropdown" onClick={(e) => e.stopPropagation()}>
            {SHELF_OPTIONS.map((opt) => (
              <li key={opt}>
                <button
                  className={`book-card__dropdown-item${saved === opt ? " book-card__dropdown-item--active" : ""}`}
                  onClick={(e) => handleSelect(e, opt)}
                >
                  {saved === opt && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                  {t(`myLibrary.shelf.${opt}`)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="book-card__info">
        <div className="book-card__text">
          <h3 className="book-card__title">{book.title}</h3>
          <p className="book-card__author">
            {book.authors.length > 0 ? book.authors.join(", ") : "Autor desconocido"}
          </p>
        </div>
        <div className="book-card__rating">
          <span className="book-card__star">★</span>
          {(book.rating ?? 0) > 0 ? (
            <>
              <span className="book-card__rating-value">{book.rating!.toFixed(1)}</span>
              {book.ratingCount && (
                <span className="book-card__rating-count">({book.ratingCount.toLocaleString()})</span>
              )}
            </>
          ) : (
            <span className="book-card__rating-count">Sin valorar</span>
          )}
        </div>
      </div>
    </article>
  );
}
