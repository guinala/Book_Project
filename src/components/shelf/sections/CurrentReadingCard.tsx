import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useShelf } from "@/hooks/useShelf";
import { resolveCoverSrc } from "@/utils/coverImage";
import UpdateProgressModal from "@/components/shelf/modals/UpdateProgressModal";
import "./CurrentReadingCard.scss";
import { encodeKey } from "@/utils/bookPaths";
import HistoryModal from "@/components/shelf/modals/HistoryModal";
import { ChevronRight } from "lucide-react";

const STORAGE_KEY = "currentReadingBookKey";

function CurrentReadingCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shelfByStatus, loading, getEntry } = useShelf();
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );

  const readingBooks = shelfByStatus.reading;

  const savedIndex = selectedKey
    ? readingBooks.findIndex((b) => b.key === selectedKey)
    : -1;
  const index = savedIndex >= 0 ? savedIndex : 0;
  const book = readingBooks[index] ?? null;

  const [prevBookKey, setPrevBookKey] = useState(book?.key ?? null);
  if (book && book.key !== prevBookKey) {
    setPrevBookKey(book.key);
    setSelectedKey(book.key);
  }

  useEffect(() => {
    if (selectedKey) localStorage.setItem(STORAGE_KEY, selectedKey);
  }, [selectedKey]);

  const entry = book ? getEntry(book.key) : null;

  if (loading) {
    return <div className="reading-card reading-card--skeleton" />;
  }

  if (!book || !entry) {
    return (
      <div className="reading-card__empty-state">
        <p className="reading-card__empty-state-text">{t("myLibrary.noCurrentReading")}</p>
      </div>
    );
  }

  const totalPages = book.pages ?? 0;
  const currentPage = entry.currentPage ?? 0;
  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;
  const coverSrc = resolveCoverSrc(book) ?? undefined;

  return (
    <>
      <h2 className="reading-card__heading">{t("myLibrary.heading")}</h2>
      <div className="reading-card__wrapper">
        <article className="reading-card">
          <button
            className="reading-card__cover-btn"
            onClick={() => navigate(`/books/${encodeKey(book.key)}`, { state: { book } })}
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
            </div>

            <div className="reading-card__progress-box">
              <div className="reading-card__progress-labels">
                <span className="reading-card__progress-label">
                  {t("myLibrary.readingProgress")}:{" "}
                  <span className="reading-card__progress-percent">{progressPercent}%</span>
                </span>
                <span className="reading-card__progress-pages">
                  {t("myLibrary.pages", { current: currentPage, total: totalPages })}
                </span>
              </div>
              <div className="reading-card__progress-bar">
                <div
                  className="reading-card__progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="reading-card__actions">
              <button className="reading-card__btn-outline" onClick={() => setIsHistoryModalOpen(true)}>{t("myLibrary.viewHistory")}</button>
              <button
                className="reading-card__btn-fill"
                onClick={() => setIsUpdateModalOpen(true)}
              >
                {t("myLibrary.updateProgress")}
              </button>
            </div>
          </div>
        </article>

        {readingBooks.length > 1 && (
          <button
            className="reading-card__chevron"
            onClick={() => {
              const nextIndex = (index + 1) % readingBooks.length;
              const nextKey = readingBooks[nextIndex].key;
              setSelectedKey(nextKey);
              localStorage.setItem(STORAGE_KEY, nextKey);
            }}
            aria-label={t("myLibrary.nextBook")}
          >
            <ChevronRight />
          </button>
        )}
      </div>

      {isUpdateModalOpen && (
        <UpdateProgressModal
          entry={entry}
          onClose={() => setIsUpdateModalOpen(false)}
        />
      )}

      {isHistoryModalOpen && (
        <HistoryModal
          bookId={book.key}
          bookTitle={book.title}
          bookAuthor={book.authors.join(", ")}
          bookCoverUrl={coverSrc}
          totalPages={totalPages}
          onClose={() => setIsHistoryModalOpen(false)}
        />
      )}
    </>
  );
}

export default CurrentReadingCard;
