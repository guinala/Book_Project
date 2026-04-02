import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./SynopsisModal.scss";

type SynopsisModalProps = {
  text: string;
  onClose: () => void;
};

export default function SynopsisModal({ text, onClose }: SynopsisModalProps) {
  const { t } = useTranslation();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="synopsis-modal"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("bookDetail.synopsisAriaLabel")}
    >
      <div className="synopsis-modal__box" onClick={(e) => e.stopPropagation()}>
        <div className="synopsis-modal__header">
          <h3 className="synopsis-modal__title">{t("bookDetail.synopsis")}</h3>
          <button className="synopsis-modal__close" onClick={onClose} aria-label={t("bookDetail.close")}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="synopsis-modal__body">
          {text.split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
