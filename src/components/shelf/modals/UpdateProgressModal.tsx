import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useShelf } from "@/context/shelf/useShelf";
import type { ShelfEntry } from "@/services/firebase/firebaseLibrary";
import type { ShelfStatus } from "@/types/BookDetail";
import { resolveCoverSrc } from "@/utils/coverImage";
import "./UpdateProgressModal.scss";
import Modal from "@/components/common/Modal";
import EditableStarRating from "@/components/common/EditableStarRating";
import LimitedTextarea from "@/components/common/TextArea";
import ProgressPageInput from "./components/ProgressPageInput";
import ModalStatusSelect from "./components/ModalStatusSelect";

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

function derivePercent(page: number, total: number): string {
  if (total === 0 || page === 0) return "0";
  return String(Math.round((page / total) * 100));
}

export default function UpdateProgressModal({ entry, onClose }: UpdateProgressModalProps) {
  const { t } = useTranslation();
  const { updateProgress, addBook } = useShelf();
  const totalPages = entry.book.pages ?? 0;

  const initialPage = entry.currentPage ?? 0;

  const [localStatus, setLocalStatus] = useState<ShelfStatus>(entry.status);
  const [pageInput, setPageInput] = useState(initialPage > 0 ? String(initialPage) : "");
  const [percentInput, setPercentInput] = useState(derivePercent(initialPage, totalPages));
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState(entry.review ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteSaveBlocked, setNoteSaveBlocked] = useState(false);
  const [noteShaking, setNoteShaking] = useState(false);
  const [reviewSaveBlocked, setReviewSaveBlocked] = useState(false);
  const [reviewShaking, setReviewShaking] = useState(false);

  const currentPage =
    pageInput === "" ? 0 : Math.max(0, Math.min(parseInt(pageInput, 10) || 0, totalPages));
  const progressPercent =
    totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  const handleSave = async () => {
    if (localStatus === "wantToRead" || localStatus === "didNotFinish") {
      setIsSubmitting(true);
      try {
        await addBook(entry.book, localStatus);
      } finally {
        setIsSubmitting(false);
        onClose();
      }
      return;
    }

    if (localStatus === "finished") {
      if (review.length > REVIEW_MAX) {
        setReviewSaveBlocked(true);
        setReviewShaking(true);
        return;
      }
      setIsSubmitting(true);
      const savePage = totalPages > 0 ? totalPages : currentPage;
      try {
        await updateProgress(entry.book.key, savePage, {
          rating: rating || undefined,
          review: review.trim() || undefined,
          status: "finished",
        });
      } finally {
        setIsSubmitting(false);
        onClose();
      }
      return;
    }

    // localStatus === "reading"
    if (note.length > NOTE_MAX) {
      setNoteSaveBlocked(true);
      setNoteShaking(true);
      return;
    }
    setIsSubmitting(true);
    try {
      await updateProgress(entry.book.key, currentPage, {
        note: note.trim() || undefined,
        status: "reading",
      });
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const coverSrc = resolveCoverSrc(entry.book);

  return (
    <Modal
      title={t("myLibrary.updateProgressModal.title")}
      ariaLabel={t("myLibrary.updateProgressModal.title")}
      closeAriaLabel={t("myLibrary.updateProgressModal.close")}
      onClose={onClose}
      closeOnBackdrop={false}
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
          <ModalStatusSelect value={localStatus} onChange={setLocalStatus} />
          {coverSrc ? (
            <img className="progress-modal__cover" src={coverSrc} alt="" />
          ) : (
            <div className="progress-modal__cover progress-modal__cover--placeholder" />
          )}
        </div>

        <div className="progress-modal__divider" aria-hidden="true" />

        <div className="progress-modal__right">
          {localStatus === "reading" && (
            <>
              <ProgressPageInput
                pageInput={pageInput}
                setPageInput={setPageInput}
                percentInput={percentInput}
                setPercentInput={setPercentInput}
                totalPages={totalPages}
                progressPercent={progressPercent}
              />
              <div className="progress-modal__section">
                <LimitedTextarea
                  id="progress-note-input"
                  label={t("myLibrary.updateProgressModal.note")}
                  placeholder={t("myLibrary.updateProgressModal.notePlaceholder")}
                  value={note}
                  onChange={setNote}
                  max={NOTE_MAX}
                  hardLimit
                  rows={4}
                  saveBlocked={noteSaveBlocked}
                  onClearBlock={() => setNoteSaveBlocked(false)}
                  shaking={noteShaking}
                  onShakeEnd={() => setNoteShaking(false)}
                  errorText={t("myLibrary.updateProgressModal.noteTooLong")}
                  charactersText={t("myLibrary.updateProgressModal.characters")}
                  classNames={TEXTAREA_CLASSNAMES}
                />
              </div>
            </>
          )}

          {localStatus === "finished" && (
            <>
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
              <div className="progress-modal__section">
                <LimitedTextarea
                  id="progress-review-input"
                  label={t("myLibrary.updateProgressModal.review")}
                  placeholder={t("myLibrary.updateProgressModal.reviewPlaceholder")}
                  value={review}
                  onChange={setReview}
                  max={REVIEW_MAX}
                  rows={5}
                  saveBlocked={reviewSaveBlocked}
                  onClearBlock={() => setReviewSaveBlocked(false)}
                  shaking={reviewShaking}
                  onShakeEnd={() => setReviewShaking(false)}
                  errorText={t("myLibrary.updateProgressModal.noteTooLong")}
                  charactersText={t("myLibrary.updateProgressModal.characters")}
                  classNames={TEXTAREA_CLASSNAMES}
                />
              </div>
            </>
          )}

          {(localStatus === "wantToRead" || localStatus === "didNotFinish") && (
            <div className="progress-modal__status-message">
              <p>{t("myLibrary.updateProgressModal.statusMessage")}</p>
            </div>
          )}
        </div>
      </div>

      <div className="progress-modal__footer">
        <button
          type="button"
          className="progress-modal__save-btn"
          onClick={handleSave}
          disabled={isSubmitting}
        >
          {t("myLibrary.updateProgressModal.save")}
        </button>
      </div>
    </Modal>
  );
}
