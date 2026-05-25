import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useShelf } from "@/hooks/useShelf";
import type { ShelfEntry } from "@/services/firebase/firebaseLibrary";
import { resolveCoverSrc } from "@/utils/coverImage";
import "./UpdateProgressModal.scss";
import Modal from "@/components/common/Modal";
import EditableStarRating from "@/components/common/EditableStarRating";
import LimitedTextarea from "@/components/common/TextArea";
import ProgressPageInput from "./components/ProgressPageInput";
import AbandonConfirmDialog from "./components/AbandonConfirmDialog";

const NOTE_MAX = 280;
const REVIEW_MAX = 600;

type UpdateProgressModalProps = {
  entry: ShelfEntry;
  onClose: () => void;
};

const TEXTAREA_CLASSNAMES = {
  field: "progress-modal__field",
  label: "progress-modal__label",
  textarea: "progress-modal__textarea",
  footer: "progress-modal__note-footer",
  error: "progress-modal__note-error",
  count: "progress-modal__note-count",
};

export default function UpdateProgressModal({ entry, onClose }: UpdateProgressModalProps) {
  const { t } = useTranslation();
  const { updateProgress, removeBook } = useShelf();
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
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  const currentPage = pageInput === ""
    ? 0
    : Math.max(0, Math.min(parseInt(pageInput, 10) || 0, totalPages));
  const finished = totalPages > 0 && currentPage === totalPages;
  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;
  const pageChanged = currentPage !== (entry.currentPage ?? 0);

  const handleSave = async () => {
    if (finished) {
      if (review.length > REVIEW_MAX) {
        setReviewSaveBlocked(true);
        setReviewShaking(true);
        return;
      }
      setIsSubmitting(true);
      try {
        await updateProgress(entry.book.key, currentPage, {
          rating: rating || undefined,
          review: review.trim() || undefined,
        });
      } finally {
        setIsSubmitting(false);
        onClose();
      }
    } else {
      if (note.length > NOTE_MAX) {
        setNoteSaveBlocked(true);
        setNoteShaking(true);
        return;
      }
      setIsSubmitting(true);
      try {
        await updateProgress(entry.book.key, currentPage, {
          note: note.trim() || undefined,
        });
      } finally {
        setIsSubmitting(false);
        onClose();
      }
    }
  };

  const handleConfirmAbandon = () => {
    onClose();
    removeBook(entry.book.key);
  };

  const coverSrc = resolveCoverSrc(entry.book);

  return (
    <Modal
      title={t("myLibrary.updateProgressModal.title")}
      ariaLabel={t("myLibrary.updateProgressModal.title")}
      closeAriaLabel={t("myLibrary.updateProgressModal.close")}
      onClose={onClose}
      usePortal
      classNames={{
        root: "progress-modal",
        box: "progress-modal__panel",
        header: "progress-modal__header",
        title: "progress-modal__title",
        close: "progress-modal__close",
      }}
    >
      <div className="progress-modal__body">
        <div className="progress-modal__left">
          <div className="progress-modal__book-info">
            {coverSrc ? (
              <img className="progress-modal__cover" src={coverSrc} alt="" />
            ) : (
              <div className="progress-modal__cover progress-modal__cover--placeholder" />
            )}
            <p className="progress-modal__book-title">{entry.book.title}</p>
            <p className="progress-modal__book-author">{entry.book.authors.join(", ")}</p>
          </div>
        </div>

        <div className="progress-modal__divider" aria-hidden="true" />

        <div className="progress-modal__right">
          <ProgressPageInput
            pageInput={pageInput}
            setPageInput={setPageInput}
            totalPages={totalPages}
            currentPage={currentPage}
            finished={finished}
            progressPercent={progressPercent}
          />

          {finished && (
            <div className="progress-modal__section">
              <div className="progress-modal__rating-block">
                <span className="progress-modal__label">
                  {t("myLibrary.updateProgressModal.rateBook")}
                </span>
                <div className="progress-modal__rating-row">
                  <EditableStarRating rating={rating} onChange={setRating} />
                </div>
              </div>
            </div>
          )}

          <div className="progress-modal__section">
            {finished ? (
              <LimitedTextarea
                id="progress-review-input"
                label={t("myLibrary.updateProgressModal.review")}
                placeholder={t("myLibrary.updateProgressModal.reviewPlaceholder")}
                value={review}
                onChange={setReview}
                max={REVIEW_MAX}
                rows={4}
                saveBlocked={reviewSaveBlocked}
                onClearBlock={() => setReviewSaveBlocked(false)}
                shaking={reviewShaking}
                onShakeEnd={() => setReviewShaking(false)}
                errorText={t("myLibrary.updateProgressModal.noteTooLong")}
                charactersText={t("myLibrary.updateProgressModal.characters")}
                classNames={TEXTAREA_CLASSNAMES}
              />
            ) : (
              <LimitedTextarea
                id="progress-note-input"
                label={t("myLibrary.updateProgressModal.notes")}
                placeholder={t("myLibrary.updateProgressModal.notesPlaceholder")}
                value={note}
                onChange={setNote}
                max={NOTE_MAX}
                hardLimit
                rows={3}
                disabled={!pageChanged}
                saveBlocked={noteSaveBlocked}
                onClearBlock={() => setNoteSaveBlocked(false)}
                shaking={noteShaking}
                onShakeEnd={() => setNoteShaking(false)}
                errorText={t("myLibrary.updateProgressModal.noteTooLong")}
                charactersText={t("myLibrary.updateProgressModal.characters")}
                classNames={TEXTAREA_CLASSNAMES}
              />
            )}
          </div>
        </div>
      </div>

      <div className="progress-modal__footer">
        <button className="progress-modal__abandon-btn" onClick={() => setConfirmAbandon(true)}>
          {t("myLibrary.updateProgressModal.abandon")}
        </button>
        <button
          className="progress-modal__save-btn"
          onClick={handleSave}
          disabled={isSubmitting}
        >
          {t("myLibrary.updateProgressModal.save")}
        </button>
      </div>

      {confirmAbandon && (
        <AbandonConfirmDialog
          onConfirm={handleConfirmAbandon}
          onCancel={() => setConfirmAbandon(false)}
        />
      )}
    </Modal>
  );
}
