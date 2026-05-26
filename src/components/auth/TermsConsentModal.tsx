import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import "./TermsConsentModal.scss";

type TermsConsentModalProps = {
  open: boolean;
  isProcessing?: boolean;
  onAccept: () => void | Promise<void>;
  onCancel: () => void;
};

export default function TermsConsentModal({
  open,
  isProcessing = false,
  onAccept,
  onCancel,
}: TermsConsentModalProps) {
  const { t } = useTranslation();
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isProcessing) onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, isProcessing, onCancel]);

  useEffect(() => {
    if (!open) setAccepted(false);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="terms-consent-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-consent-modal-title"
    >
      <div
        className="terms-consent-modal__backdrop"
        onClick={() => { if (!isProcessing) onCancel(); }}
      />
      <div className="terms-consent-modal__panel">
        <h2
          id="terms-consent-modal-title"
          className="terms-consent-modal__title"
        >
          {t("auth.consentModalTitle")}
        </h2>
        <p className="terms-consent-modal__body">
          {t("auth.consentModalBody")}
        </p>

        <label className="auth__remember auth__terms-row">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            disabled={isProcessing}
          />
          <span>
            <Trans
              i18nKey="auth.acceptTermsLabel"
              components={{
                terms: (
                  <a
                    className="auth__terms-link"
                    href="/legal/terms"
                    target="_blank"
                    rel="noreferrer noopener"
                  />
                ),
                privacy: (
                  <a
                    className="auth__terms-link"
                    href="/legal/privacy"
                    target="_blank"
                    rel="noreferrer noopener"
                  />
                ),
              }}
            />
          </span>
        </label>

        <div className="terms-consent-modal__actions">
          <button
            type="button"
            className="terms-consent-modal__btn terms-consent-modal__btn--secondary"
            onClick={onCancel}
            disabled={isProcessing}
          >
            {t("auth.consentCancel")}
          </button>
          <button
            type="button"
            className="terms-consent-modal__btn terms-consent-modal__btn--primary"
            onClick={() => { void onAccept(); }}
            disabled={!accepted || isProcessing}
          >
            {isProcessing ? t("auth.registering") : t("auth.consentAccept")}
          </button>
        </div>
      </div>
    </div>
  );
}
