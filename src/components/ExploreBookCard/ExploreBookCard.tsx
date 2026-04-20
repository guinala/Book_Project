import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import type { Book } from "@/types/Book";
import { getCoverUrl } from "@/utils/coverImage";
import { useTranslation } from "react-i18next";
import "./ExploreBookCard.scss";

const SHELF_OPTIONS = ["Quiero leer", "Leyendo", "Acabado", "No acabado"];

type ExploreBookCardProps = {
  book: Book;
  rank?: number;
};

export default function ExploreBookCard({ book, rank }: ExploreBookCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [coverFailed, setCoverFailed] = useState(false);
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
    navigate(`/book/${encodeURIComponent(book.key)}`, { state: { book } });
  };

  const handleSaveBtnClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDropdownOpen((o) => !o);
  };

  const handleSelect = (e: React.MouseEvent, option: string) => {
    e.stopPropagation();
    setSaved(saved === option ? null : option);
    setDropdownOpen(false);
  };

  const hasCover = (book.cover_url || book.cover_id) && !coverFailed;
  const coverSrc = book.cover_url ?? (book.cover_id ? getCoverUrl(book.cover_id) : "");

  return (
    <article
      className={`explore-card${dropdownOpen ? " explore-card--open" : ""}`}
      onClick={handleCardClick}
    >
      <div className="explore-card__cover-wrapper">
        {hasCover ? (
          <img
            className="explore-card__cover"
            src={coverSrc}
            alt={t("book.coverAlt", { title: book.title })}
            loading="lazy"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="explore-card__cover-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
        )}
        {rank && <span className="explore-card__rank">{rank}</span>}
      </div>

      <div className="explore-card__save-wrapper" ref={wrapperRef}>
        <button
          className={`explore-card__save-btn${dropdownOpen ? " explore-card__save-btn--open" : ""}${saved && !dropdownOpen ? " explore-card__save-btn--saved" : ""}`}
          onClick={handleSaveBtnClick}
          aria-label="Guardar libro"
        >
          {saved && !dropdownOpen ? (
            <svg className="explore-card__save-icon" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M5 3a2 2 0 0 0-2 2v16l9-6 9 6V5a2 2 0 0 0-2-2H5z"/>
            </svg>
          ) : (
            <svg className={`explore-card__save-icon${dropdownOpen ? " explore-card__save-icon--open" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          )}
        </button>

        {dropdownOpen && (
          <ul className="explore-card__dropdown" onClick={(e) => e.stopPropagation()}>
            {SHELF_OPTIONS.map((opt) => (
              <li key={opt}>
                <button
                  className={`explore-card__dropdown-item${saved === opt ? " explore-card__dropdown-item--active" : ""}`}
                  onClick={(e) => handleSelect(e, opt)}
                >
                  {saved === opt && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="explore-card__info">
        <div className="explore-card__text">
          <h3 className="explore-card__title">{book.title}</h3>
          <p className="explore-card__author">
            {book.authors.length > 0 ? book.authors.join(", ") : "Autor desconocido"}
          </p>
        </div>
        <div className="explore-card__rating">
          <span className="explore-card__star">★</span>
          {(book.rating ?? 0) > 0 ? (
            <>
              <span className="explore-card__rating-value">{book.rating!.toFixed(1)}</span>
              {book.ratingCount && (
                <span className="explore-card__rating-count">({book.ratingCount.toLocaleString()})</span>
              )}
            </>
          ) : (
            <span className="explore-card__rating-count">Sin valorar</span>
          )}
        </div>
      </div>
    </article>
  );
}
