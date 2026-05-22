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
import { BookOpen, Bookmark, Plus, Star } from "lucide-react";

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
  const dropdownRef = useRef<HTMLUListElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideWrapper = wrapperRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideWrapper && !insideDropdown) {
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
            <BookOpen strokeWidth={1.5} />
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
            <Bookmark className="book-card__save-icon" fill="currentColor" stroke="none" />
          ) : (
            <Plus className={`book-card__save-icon${dropdownOpen ? " book-card__save-icon--open" : ""}`} />
          )}
        </button>
      </div>

      {dropdownOpen && (
        <ul className="book-card__dropdown" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
          {SHELF_OPTIONS.map((opt) => (
            <li key={opt}>
              <button
                className={`book-card__dropdown-item${saved === opt ? " book-card__dropdown-item--active" : ""}`}
                onClick={(e) => handleSelect(e, opt)}
              >
                {saved === opt && <Bookmark size={16} />}
                {t(`myLibrary.shelf.${opt}`)}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="book-card__info">
        <div className="book-card__text">
          <h3 className="book-card__title">{book.title}</h3>
          <p className="book-card__author">
            {book.authors.length > 0 ? book.authors.join(", ") : "Autor desconocido"}
          </p>
        </div>
        <div className="book-card__rating">
          <Star className="book-card__star" size={13} fill="currentColor" stroke="none" />
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
