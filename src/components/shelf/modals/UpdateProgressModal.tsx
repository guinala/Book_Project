import { useId, useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useShelf } from "@/hooks/useShelf";
import type { ShelfEntry } from "@/services/firebase/firebaseLibrary";
import { getCoverUrl } from "@/utils/coverImage";
import { X } from "lucide-react";
import "./UpdateProgressModal.scss";

type UpdateProgressModalProps = {
  entry: ShelfEntry;
  onClose: () => void;
}

type StarRatingProps = {
  rating: number;
  onChange: (v: number) => void;
}


function StarSvg({ fill, uid }: { fill: 0 | 0.5 | 1; uid: string }) {
  const pct = fill === 1 ? "100%" : fill === 0.5 ? "50%" : "0%";
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
      <defs>
        <linearGradient id={uid}>
          <stop offset={pct} stopColor="var(--color-accent)" />
          <stop offset={pct} stopColor="var(--color-border-subtle)" />
        </linearGradient>
      </defs>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={`url(#${uid})`}
        stroke="var(--color-accent)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarRating({ rating, onChange }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const gradBase = useId();
  const display = hover || rating;

  return (
    <div
      className="star-rating"
      onMouseLeave={() => setHover(0)}
      role="group"
      aria-label="Valoración"
    >
      {[1, 2, 3, 4, 5].map(star => {
        const fill: 0 | 0.5 | 1 =
          display >= star ? 1 : display >= star - 0.5 ? 0.5 : 0;
        return (
          <span
            key={star}
            className="star-rating__star"
            onMouseMove={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHover(
                (e.clientX - rect.left) / rect.width < 0.5 ? star - 0.5 : star
              );
            }}
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              onChange(
                (e.clientX - rect.left) / rect.width < 0.5 ? star - 0.5 : star
              );
            }}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") onChange(star);
            }}
            aria-label={`${star} estrellas`}
          >
            <StarSvg fill={fill} uid={`${gradBase}-${star}`} />
          </span>
        );
      })}
    </div>
  );
}

export default function UpdateProgressModal({ entry, onClose }: UpdateProgressModalProps) {
  const { t } = useTranslation();
  const { updateProgress, addBook } = useShelf();
  const panelRef = useRef<HTMLDivElement>(null);
  const prevPageRef = useRef(entry.currentPage ?? 0);
  const totalPages = entry.book.pages ?? 0;

  const [pageInput, setPageInput] = useState(
    entry.currentPage ? String(entry.currentPage) : ""
  );
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState(entry.review ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteSaveBlocked, setNoteSaveBlocked] = useState(false);
  const [noteShaking, setNoteShaking] = useState(false);
  const [reviewSaveBlocked, setReviewSaveBlocked] = useState(false);
  const [reviewShaking, setReviewShaking] = useState(false);

  const NOTE_MAX = 280;
  const REVIEW_MAX = 600;
  const noteOverLimit = note.length > NOTE_MAX;
  const reviewOverLimit = review.length > REVIEW_MAX;

  const currentPage = pageInput === ""
    ? 0
    : Math.max(0, Math.min(parseInt(pageInput, 10) || 0, totalPages));
  const finished = totalPages > 0 && currentPage === totalPages;
  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handlePageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    const stripped = digits.replace(/^0+/, "");
    if (stripped === "") { setPageInput(""); return; }
    const clamped = totalPages > 0 ? Math.min(parseInt(stripped, 10), totalPages) : parseInt(stripped, 10);
    setPageInput(String(clamped));
  };

  const handleToggleFinished = () => {
    if (finished) {
      setPageInput(prevPageRef.current > 0 ? String(prevPageRef.current) : "");
    } else {
      prevPageRef.current = currentPage;
      setPageInput(String(totalPages));
    }
  };

  const handleSave = async () => {
    if (finished) {
      if (reviewOverLimit) {
        setReviewSaveBlocked(true);
        setReviewShaking(true);
        return;
      }
      setIsSubmitting(true);
      try {
        await updateProgress(
          entry.book.key,
          currentPage,
          undefined,
          rating || undefined,
          review.trim() || undefined
        );
      } finally {
        setIsSubmitting(false);
        onClose();
      }
    } else {
      if (noteOverLimit) {
        setNoteSaveBlocked(true);
        setNoteShaking(true);
        return;
      }
      setIsSubmitting(true);
      try {
        await updateProgress(entry.book.key, currentPage, note.trim() || undefined);
      } finally {
        setIsSubmitting(false);
        onClose();
      }
    }
  };

  const handleAbandon = async () => {
    await addBook(entry.book, "didNotFinish");
    onClose();
  };

  const coverSrc = entry.book.cover_url ?? (entry.book.cover_id ? getCoverUrl(entry.book.cover_id) : undefined);

  return createPortal(
    <div
      className="progress-modal"
      onMouseDown={handleBackdropMouseDown}
      role="dialog"
      aria-modal="true"
      aria-label={t("myLibrary.updateProgressModal.title")}
    >
      <div className="progress-modal__panel" ref={panelRef}>
        <div className="progress-modal__header">
          <h2 className="progress-modal__title">
            {t("myLibrary.updateProgressModal.title")}
          </h2>
          <button
            className="progress-modal__close"
            onClick={onClose}
            aria-label={t("myLibrary.updateProgressModal.close")}
          >
            <X />
          </button>
        </div>

        <div className="progress-modal__body">
          <div className="progress-modal__left">
            <div className="progress-modal__book-info">
              {coverSrc ? (
                <img className="progress-modal__cover" src={coverSrc} alt="" />
              ) : (
                <div className="progress-modal__cover progress-modal__cover--placeholder" />
              )}
              <p className="progress-modal__book-title">{entry.book.title}</p>
              <p className="progress-modal__book-author">
                {entry.book.authors.join(", ")}
              </p>
            </div>
            <button className="progress-modal__abandon-btn" onClick={handleAbandon}>
              {t("myLibrary.updateProgressModal.abandon")}
            </button>
          </div>

          <div className="progress-modal__divider" aria-hidden="true" />

          <div className="progress-modal__right">
            <div className="progress-modal__section">
              <div className="progress-modal__field">
                <label
                  className="progress-modal__label"
                  htmlFor="progress-page-input"
                >
                  {t("myLibrary.updateProgressModal.currentPage")}
                </label>
                <div className="progress-modal__page-row">
                  <input
                    id="progress-page-input"
                    className="progress-modal__page-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pageInput}
                    onChange={handlePageChange}
                    onFocus={(e) => e.target.select()}
                  />
                  {totalPages > 0 && (
                    <span className="progress-modal__page-total">
                      {t("myLibrary.updateProgressModal.of")} {totalPages}
                    </span>
                  )}
                  <span className="progress-modal__progress-pct">
                    {progressPercent}%
                  </span>
                </div>
                <div className="progress-modal__progress-track">
                  <div
                    className="progress-modal__progress-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="progress-modal__field progress-modal__field--toggle">
                <span className="progress-modal__label">
                  {t("myLibrary.updateProgressModal.finished")}
                </span>
                <button
                  className={`progress-modal__toggle${finished ? " progress-modal__toggle--on" : ""}`}
                  role="switch"
                  aria-checked={finished}
                  onClick={handleToggleFinished}
                >
                  <span className="progress-modal__toggle-knob" />
                </button>
              </div>

              {finished && (
                <div className="progress-modal__rating-block">
                  <span className="progress-modal__label">
                    {t("myLibrary.updateProgressModal.rateBook")}
                  </span>
                  <div className="progress-modal__rating-row">
                    <StarRating rating={rating} onChange={setRating} />
                    {rating > 0 && (
                      <span className="progress-modal__rating-value">
                        {rating} / 5
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="progress-modal__section">
              {finished ? (
                <div className="progress-modal__field">
                  <label
                    className="progress-modal__label"
                    htmlFor="progress-review-input"
                  >
                    {t("myLibrary.updateProgressModal.review")}
                  </label>
                  <textarea
                    id="progress-review-input"
                    className={[
                      "progress-modal__textarea",
                      reviewSaveBlocked && reviewOverLimit
                        ? "progress-modal__textarea--error"
                        : "",
                      reviewShaking ? "progress-modal__textarea--shaking" : "",
                    ].filter(Boolean).join(" ")}
                    value={review}
                    onChange={(e) => {
                      setReview(e.target.value);
                      if (reviewSaveBlocked && e.target.value.length <= REVIEW_MAX)
                        setReviewSaveBlocked(false);
                    }}
                    onAnimationEnd={() => setReviewShaking(false)}
                    placeholder={t("myLibrary.updateProgressModal.reviewPlaceholder")}
                    rows={4}
                  />
                  <div className="progress-modal__note-footer">
                    {reviewSaveBlocked && reviewOverLimit && (
                      <span className="progress-modal__note-error">
                        {t("myLibrary.updateProgressModal.noteTooLong")}
                      </span>
                    )}
                    <span
                      className={`progress-modal__note-count${reviewOverLimit ? " progress-modal__note-count--over" : ""}`}
                    >
                      {review.length} / {REVIEW_MAX}{" "}
                      {t("myLibrary.updateProgressModal.characters")}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="progress-modal__field">
                  <label
                    className="progress-modal__label"
                    htmlFor="progress-note-input"
                  >
                    {t("myLibrary.updateProgressModal.notes")}
                  </label>
                  <textarea
                    id="progress-note-input"
                    className={[
                      "progress-modal__textarea",
                      noteSaveBlocked && noteOverLimit
                        ? "progress-modal__textarea--error"
                        : "",
                      noteShaking ? "progress-modal__textarea--shaking" : "",
                    ].filter(Boolean).join(" ")}
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value);
                      if (noteSaveBlocked && e.target.value.length <= NOTE_MAX)
                        setNoteSaveBlocked(false);
                    }}
                    onAnimationEnd={() => setNoteShaking(false)}
                    placeholder={t("myLibrary.updateProgressModal.notesPlaceholder")}
                    rows={3}
                  />
                  <div className="progress-modal__note-footer">
                    {noteSaveBlocked && noteOverLimit && (
                      <span className="progress-modal__note-error">
                        {t("myLibrary.updateProgressModal.noteTooLong")}
                      </span>
                    )}
                    <span
                      className={`progress-modal__note-count${noteOverLimit ? " progress-modal__note-count--over" : ""}`}
                    >
                      {note.length} / {NOTE_MAX}{" "}
                      {t("myLibrary.updateProgressModal.characters")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="progress-modal__footer">
          <button
            className="progress-modal__save-btn"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {t("myLibrary.updateProgressModal.save")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}