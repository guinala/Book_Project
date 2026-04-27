import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useShelf } from "@/hooks/useShelf";
import { getCoverUrl } from "@/utils/coverImage";
import UpdateProgressModal from "@/components/UpdateProgressModal/UpdateProgressModal";
import "./CurrentReadingCard.scss";

const STREAK_DAYS = 12;

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

function CurrentReadingCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shelfByStatus, loading, getEntry } = useShelf();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const readingBooks = shelfByStatus.reading;
  const book = readingBooks[0] ?? null;
  const entry = book ? getEntry(book.key) : null;

  if (loading) {
    return <div className="reading-card reading-card--skeleton" />;
  }

  if (!book || !entry) {
    return <p className="reading-card__empty">{t("myLibrary.noCurrentReading")}</p>;
  }

  const totalPages = book.pages ?? 0;
  const currentPage = entry.currentPage ?? 0;
  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;
  const coverSrc = book.cover_url ?? (book.cover_id ? getCoverUrl(book.cover_id) : undefined);

  return (
    <>
      <article className="reading-card">
        <button
          className="reading-card__cover-btn"
          onClick={() => navigate(`/book/${encodeURIComponent(book.key)}`, { state: { book } })}
          aria-label={t("book.coverAlt", { title: book.title })}
        >
          {coverSrc ? (
            <img
              className="reading-card__cover-img"
              src={coverSrc}
              alt=""
            />
          ) : (
            <div className="reading-card__cover-placeholder" />
          )}
        </button>

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
                {t("myLibrary.pages", { current: currentPage, total: totalPages })}
              </span>
            </div>
            <div className="reading-card__progress-bar">
              <div
                className="reading-card__progress-fill"
                style={{ width: `${progressPercent}%` }}
              >
                <span className="reading-card__progress-percent">{progressPercent}%</span>
              </div>
            </div>
          </div>

          <div className="reading-card__actions">
            <button className="reading-card__btn-outline">{t("myLibrary.viewHistory")}</button>
            <button
              className="reading-card__btn-fill"
              onClick={() => setIsModalOpen(true)}
            >
              {t("myLibrary.updateProgress")}
            </button>
          </div>
        </div>

        <button
          className="reading-card__chevron"
          onClick={() => navigate(`/book/${encodeURIComponent(book.key)}`, { state: { book } })}
          aria-label={t("book.coverAlt", { title: book.title })}
        >
          <ChevronRightIcon />
        </button>
      </article>

      {isModalOpen && (
        <UpdateProgressModal
          entry={entry}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

export default CurrentReadingCard;
