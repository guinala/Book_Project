import { useTranslation } from "react-i18next";
import type { Book } from "@/types/Book";
import "./CurrentReadingCard.scss";

const CURRENT_PAGE = 344;
const TOTAL_PAGES = 540;
const STREAK_DAYS = 12;
const PROGRESS_PERCENT = Math.round((CURRENT_PAGE / TOTAL_PAGES) * 100);

function FlameIcon() {
  return (
    <svg width="14" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z"/>
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

type CurrentReadingCardProps = {
  book: Book | null;
  loading?: boolean;
};

function CurrentReadingCard({ book, loading = false }: CurrentReadingCardProps) {
  const { t } = useTranslation();


  if (loading) {
    return <div className="reading-card reading-card--skeleton" />;
  }

  if (!book) return null;

  return (
    <article className="reading-card">
      {book.cover_url ? (
        <img
          className="reading-card__cover-img"
          src={book.cover_url}
          alt={t("book.coverAlt", { title: book.title })}
        />
      ) : (
        <div className="reading-card__cover-placeholder" />
      )}

      <div className="reading-card__body">
        <div className="reading-card__header">
          <div>
            <h3 className="reading-card__title">{book.title}</h3>
            <p className="reading-card__author">{book.authors.join(", ")}</p>
          </div>
          <div className="reading-card__streak">
            <FlameIcon />
            <span>{t("myLibrary.streakDays", { count: STREAK_DAYS })}</span>
          </div>
        </div>

        <div className="reading-card__progress-box">
          <div className="reading-card__progress-labels">
            <span className="reading-card__progress-label">
              {t("myLibrary.readingProgress")}
            </span>
            <span className="reading-card__progress-pages">
              {t("myLibrary.pages", { current: CURRENT_PAGE, total: TOTAL_PAGES })}
            </span>
          </div>
          <div className="reading-card__progress-bar">
            <div
              className="reading-card__progress-fill"
              style={{ width: `${PROGRESS_PERCENT}%` }}
            >
              <span className="reading-card__progress-percent">{PROGRESS_PERCENT}%</span>
            </div>
          </div>
        </div>

        <div className="reading-card__actions">
          <button className="reading-card__btn-outline">{t("myLibrary.viewHistory")}</button>
          <button className="reading-card__btn-fill">{t("myLibrary.updateProgress")}</button>
        </div>
      </div>

      <button className="reading-card__chevron">
        <ChevronRightIcon />
      </button>
    </article>
  );
}

export default CurrentReadingCard;
