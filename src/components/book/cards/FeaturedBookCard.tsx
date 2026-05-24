import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import { resolveCoverSrc } from "@/utils/coverImage";
import { useTranslation } from "react-i18next";
import { useShelf } from "@/hooks/useShelf";
import { useAuth } from "@/hooks/useAuth";
import { encodeKey } from "@/utils/bookPaths";
import { genreToI18nKey } from "@/utils/genreUtils";
import { BookOpen, Bookmark, Star } from "lucide-react";
import { fetchSynopsisRace } from "@/services/api/synopsisSources";
import "./FeaturedBookCard.scss";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import { useClickOutside } from "@/hooks/useClickOutside";

const SHELF_OPTIONS: ShelfStatus[] = ["wantToRead", "reading", "finished", "didNotFinish"];

type FeaturedBookCardProps = {
  book: Book;
};

export default function FeaturedBookCard({ book }: FeaturedBookCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const [synopsis, setSynopsis] = useState(book.synopsis ?? "");
  const { addBook, removeBook, getStatus } = useShelf();
  const { isAuthenticated } = useAuth();
  const saved = getStatus(book.key);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { lang } = useCurrentLanguage();

  useClickOutside(wrapperRef, () => setDropdownOpen(false), dropdownOpen);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setSynopsis(book.synopsis ?? "");
    if (book.synopsis) return;
    const controller = new AbortController();
    fetchSynopsisRace({
      title: book.title,
      isbn: book.isbn,
      author: book.authors[0],
      lang,
      signal: controller.signal,
      workKey: book.key,
    }).then((result) => {
      if (result) setSynopsis(result);
    }).catch(() => {});
    return () => controller.abort();
  }, [book.key, lang]);

  const handleCardClick = () => {
    navigate(`/books/${encodeKey(book.key)}`, { state: { book } });
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/books/${encodeKey(book.key)}`, { state: { book } });
  };

  const handleSaveBtnClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setTooltipVisible(true);
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = setTimeout(() => setTooltipVisible(false), 2000);
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
  const coverSrc = resolveCoverSrc(book) ?? "";
  const rating = book.rating ?? 0;
  const genreLabel = book.genre
    ? t(`book.genres.${genreToI18nKey(book.genre)}`, { defaultValue: book.genre })
    : null;

  return (
    <article
      className={`featured-book-card${dropdownOpen ? " featured-book-card--open" : ""}`}
      onClick={handleCardClick}
    >
      <div className="featured-book-card__cover-wrapper">
        {hasCover ? (
          <img
            className="featured-book-card__cover"
            src={coverSrc}
            alt={t("book.coverAlt", { title: book.title })}
            loading="lazy"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="featured-book-card__cover-placeholder">
            <BookOpen strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="featured-book-card__body">
        {(genreLabel || book.pages || book.first_publish_year) && (
          <div className="featured-book-card__meta">
            {genreLabel && (
              <div className="featured-book-card__meta-item">
                <span className="featured-book-card__meta-label">{t("book.meta.genre")}</span>
                <span className="featured-book-card__meta-dot">·</span>
                <span className="featured-book-card__meta-value">{genreLabel}</span>
              </div>
            )}
            {book.pages && (
              <div className="featured-book-card__meta-item">
                <span className="featured-book-card__meta-label">{t("book.meta.pages")}</span>
                <span className="featured-book-card__meta-dot">·</span>
                <span className="featured-book-card__meta-value">{book.pages}</span>
              </div>
            )}
            {book.first_publish_year && (
              <div className="featured-book-card__meta-item">
                <span className="featured-book-card__meta-label">{t("book.meta.year")}</span>
                <span className="featured-book-card__meta-dot">·</span>
                <span className="featured-book-card__meta-value">{book.first_publish_year}</span>
              </div>
            )}
          </div>
        )}

        <div className="featured-book-card__text">
          <h3 className="featured-book-card__title">{book.title}</h3>
          <p className="featured-book-card__author">
            {book.authors.length > 0 ? book.authors.join(", ") : t("book.unknownAuthor")}
          </p>
          <div className="featured-book-card__rating">
            <Star className="featured-book-card__star" size={13} fill="currentColor" stroke="none" />
            {rating > 0 ? (
              <>
                <span className="featured-book-card__rating-value">{rating.toFixed(1)}</span>
                {book.ratingCount && (
                  <span className="featured-book-card__rating-count">
                    ({book.ratingCount.toLocaleString()})
                  </span>
                )}
              </>
            ) : (
              <span className="featured-book-card__rating-count">{t("book.noRating")}</span>
            )}
          </div>
        </div>

        {synopsis && (
          <p className="featured-book-card__synopsis">{synopsis}</p>
        )}

        <div className="featured-book-card__btns">
          <button
            type="button"
            className="featured-book-card__btn featured-book-card__btn--outline"
            onClick={handleViewClick}
          >
            {t("book.viewPage")}
          </button>

          <div className="featured-book-card__save-wrapper" ref={wrapperRef}>
            {tooltipVisible && (
              <span className="featured-book-card__tooltip">{t("explore.saveTooltip")}</span>
            )}
            <button
              type="button"
              className={`featured-book-card__btn featured-book-card__btn--solid${saved && !dropdownOpen ? " featured-book-card__btn--saved" : ""}`}
              onClick={handleSaveBtnClick}
              aria-label={t("book.save")}
            >
              {saved && !dropdownOpen ? (
                <>
                  <Bookmark size={14} fill="currentColor" stroke="none" />
                  {t("book.saved")}
                </>
              ) : (
                t("book.save")
              )}
            </button>

            {dropdownOpen && (
              <ul
                className="featured-book-card__dropdown"
                onClick={(e) => e.stopPropagation()}
              >
                {SHELF_OPTIONS.map((opt) => (
                  <li key={opt}>
                    <button
                      className={`featured-book-card__dropdown-item${saved === opt ? " featured-book-card__dropdown-item--active" : ""}`}
                      onClick={(e) => handleSelect(e, opt)}
                    >
                      {saved === opt && <Bookmark size={16} />}
                      {t(`myLibrary.shelf.${opt}`)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
