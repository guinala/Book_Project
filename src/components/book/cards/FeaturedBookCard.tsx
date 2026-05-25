import { useState } from "react";
import { useNavigate } from "react-router";
import type { Book } from "@/types/Book";
import { resolveCoverSrc } from "@/utils/coverImage";
import { useTranslation } from "react-i18next";
import { encodeKey } from "@/utils/bookPaths";
import { genreToI18nKey } from "@/utils/genreUtils";
import { BookOpen, Star } from "lucide-react";
import "./FeaturedBookCard.scss";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import ShelfDropdownButton from "@/components/book/shelf-dropdown/ShelfDropdownButton";
import { useBookSynopsis } from "@/hooks/useBookSynopsis";

type FeaturedBookCardProps = {
  book: Book;
};

export default function FeaturedBookCard({ book }: FeaturedBookCardProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { lang } = useCurrentLanguage();
  const synopsis = useBookSynopsis(book, lang);

  const [prevBookKey, setPrevBookKey] = useState(book.key);
  if (book.key !== prevBookKey) {
    setPrevBookKey(book.key);
  }

  const handleCardClick = () => {
    navigate(`/books/${encodeKey(book.key)}`, { state: { book } });
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/books/${encodeKey(book.key)}`, { state: { book } });
  };

  const hasCover = (book.cover_url || book.cover_id) && !coverFailed;
  const coverSrc = resolveCoverSrc(book) ?? "";
  const rating = book.rating ?? 0;
  const genreLabel = book.genre
    ? t(`book.genres.${genreToI18nKey(book.genre)}`, { defaultValue: book.genre })
    : null;

  return (
    <article
      className={`featured-book-card`}
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

          <ShelfDropdownButton
            book={book}
            variant="featured"
            classNames={{
              root: "featured-book-card__save-wrapper",
              btn: "featured-book-card__btn featured-book-card__btn--solid",
              list: "featured-book-card__dropdown",
              item: "featured-book-card__dropdown-item",
              tooltip: "featured-book-card__tooltip",
            }}
          />
        </div>
      </div>
    </article>
  );
}
