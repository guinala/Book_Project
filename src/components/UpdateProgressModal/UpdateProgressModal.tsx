import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useShelf } from "@/hooks/useShelf";
import type { ShelfEntry } from "@/services/firebase/firebase_library";
import { getCoverUrl } from "@/utils/coverImage";
import "./UpdateProgressModal.scss";

interface UpdateProgressModalProps {
  entry: ShelfEntry;
  onClose: () => void;
}

export default function UpdateProgressModal({ entry, onClose }: UpdateProgressModalProps) {
  const { t } = useTranslation();
  const { updateProgress, addBook } = useShelf();
  const panelRef = useRef<HTMLDivElement>(null);
  const totalPages = entry.book.pages ?? 0;

  const [currentPage, setCurrentPage] = useState(entry.currentPage ?? 0);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const val = Math.max(0, Math.min(Number(e.target.value), totalPages));
    setCurrentPage(val);
  };

  const handleToggleFinished = () => {
    setCurrentPage(finished ? currentPage : totalPages);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateProgress(entry.book.key, currentPage, note.trim() || undefined);
    } finally {
      setIsSubmitting(false);
      onClose();
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
          <h2 className="progress-modal__title">{t("myLibrary.updateProgressModal.title")}</h2>
          <button
            className="progress-modal__close"
            onClick={onClose}
            aria-label={t("myLibrary.updateProgressModal.close")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="progress-modal__body">
          <div className="progress-modal__left">
            {coverSrc ? (
              <img className="progress-modal__cover" src={coverSrc} alt="" />
            ) : (
              <div className="progress-modal__cover progress-modal__cover--placeholder" />
            )}
            <p className="progress-modal__book-title">{entry.book.title}</p>
            <p className="progress-modal__book-author">{entry.book.authors.join(", ")}</p>
            <button className="progress-modal__abandon-btn" onClick={handleAbandon}>
              {t("myLibrary.updateProgressModal.abandon")}
            </button>
          </div>

          <div className="progress-modal__divider" aria-hidden="true" />

          <div className="progress-modal__right">
            <div className="progress-modal__field">
              <label className="progress-modal__label" htmlFor="progress-page-input">
                {t("myLibrary.updateProgressModal.currentPage")}
              </label>
              <div className="progress-modal__page-row">
                <input
                  id="progress-page-input"
                  className="progress-modal__page-input"
                  type="number"
                  min={0}
                  max={totalPages || undefined}
                  value={currentPage}
                  onChange={handlePageChange}
                />
                {totalPages > 0 && (
                  <span className="progress-modal__page-total">
                    {t("myLibrary.updateProgressModal.of")} {totalPages}
                  </span>
                )}
              </div>
            </div>

            <div className="progress-modal__field">
              <div className="progress-modal__progress-track">
                <div
                  className="progress-modal__progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="progress-modal__progress-pct">{progressPercent}%</span>
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

            <div className="progress-modal__field">
              <label className="progress-modal__label" htmlFor="progress-note-input">
                {t("myLibrary.updateProgressModal.notes")}
              </label>
              <textarea
                id="progress-note-input"
                className="progress-modal__textarea"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("myLibrary.updateProgressModal.notesPlaceholder")}
                rows={3}
              />
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
