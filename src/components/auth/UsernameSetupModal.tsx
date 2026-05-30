import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUsernameAvailability } from "@/hooks/useUsernameAvailability";
import "./UsernameSetupModal.scss";

type UsernameSetupModalProps = {
  open: boolean;
  uid: string;
  isProcessing?: boolean;
  error?: string;
  onSubmit: (username: string) => void | Promise<void>;
  onCancel: () => void;
};

export default function UsernameSetupModal({
  open,
  uid,
  isProcessing = false,
  error,
  onSubmit,
  onCancel,
}: UsernameSetupModalProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const status = useUsernameAvailability(username, uid);

  useEffect(() => {
    if (!open) setUsername("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isProcessing) onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, isProcessing, onCancel]);

  if (!open) return null;

  const canSubmit = status === "available" && !isProcessing;

  return (
    <div
      className="username-setup-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="username-setup-modal-title"
    >
      <div
        className="username-setup-modal__backdrop"
        onClick={() => { if (!isProcessing) onCancel(); }}
      />
      <div className="username-setup-modal__panel">
        <h2 id="username-setup-modal-title" className="username-setup-modal__title">
          {t("auth.usernameModalTitle")}
        </h2>
        <p className="username-setup-modal__body">{t("auth.usernameModalBody")}</p>

        <div className="username-setup-modal__input-wrap">
          <span className="username-setup-modal__prefix">@</span>
          <input
            className="username-setup-modal__input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t("auth.usernamePlaceholder")}
            disabled={isProcessing}
            autoFocus
            aria-label={t("auth.usernameModalTitle")}
          />
        </div>

        {status === "checking" && (
          <p className="username-setup-modal__hint">{t("auth.usernameChecking")}</p>
        )}
        {status === "taken" && (
          <p className="username-setup-modal__error">{t("authErrors.username-taken")}</p>
        )}
        {status === "available" && (
          <p className="username-setup-modal__success">{t("auth.usernameAvailable")}</p>
        )}
        {error && <p className="username-setup-modal__error">{error}</p>}

        <div className="username-setup-modal__actions">
          <button
            type="button"
            className="username-setup-modal__btn username-setup-modal__btn--secondary"
            onClick={onCancel}
            disabled={isProcessing}
          >
            {t("auth.consentCancel")}
          </button>
          <button
            type="button"
            className="username-setup-modal__btn username-setup-modal__btn--primary"
            onClick={() => { void onSubmit(username); }}
            disabled={!canSubmit}
          >
            {isProcessing ? t("auth.registering") : t("auth.usernameContinue")}
          </button>
        </div>
      </div>
    </div>
  );
}
