import { useTranslation } from "react-i18next";

type AbandonConfirmDialogProps = {
  onConfirm: () => void;
  onCancel: () => void;
};

export default function AbandonConfirmDialog({ onConfirm, onCancel }: AbandonConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <div className="progress-modal__confirm-overlay">
      <div className="progress-modal__confirm-box">
        <p className="progress-modal__confirm-title">
          {t("myLibrary.updateProgressModal.abandonConfirm.title")}
        </p>
        <p className="progress-modal__confirm-subtitle">
          {t("myLibrary.updateProgressModal.abandonConfirm.subtitle")}
        </p>
        <div className="progress-modal__confirm-actions">
          <button className="progress-modal__confirm-accept" onClick={onConfirm}>
            {t("myLibrary.updateProgressModal.abandonConfirm.confirm")}
          </button>
          <button className="progress-modal__confirm-cancel" onClick={onCancel}>
            {t("myLibrary.updateProgressModal.abandonConfirm.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
