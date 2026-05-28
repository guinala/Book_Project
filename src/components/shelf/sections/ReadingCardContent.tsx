import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { resolveCoverSrc } from "@/utils/coverImage";
import { encodeKey } from "@/utils/bookPaths";
import type { ShelfEntry } from "@/services/firebase/firebaseLibrary";

interface ReadingCardContentProps {
  entry: ShelfEntry;
  onOpenHistory: () => void;
  onOpenUpdate: () => void;
}

function ReadingCardContent({ entry, onOpenHistory, onOpenUpdate }: ReadingCardContentProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const book = entry.book;
  const totalPages = book.pages ?? 0;
  const currentPage = entry.currentPage ?? 0;
  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;
  const coverSrc = resolveCoverSrc(book) ?? undefined;

  return (
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
          <button className="reading-card__btn-outline" onClick={onOpenHistory}>
            {t("myLibrary.viewHistory")}
          </button>
          <button className="reading-card__btn-fill" onClick={onOpenUpdate}>
            {t("myLibrary.updateProgress")}
          </button>
        </div>
      </div>
    </article>
  );
}

export default ReadingCardContent;
