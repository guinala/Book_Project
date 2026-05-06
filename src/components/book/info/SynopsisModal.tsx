import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
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

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

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
            <X />
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
