import { useTranslation } from "react-i18next";
import { Ban } from "lucide-react";
import "./BlockedProfileNotice.scss";

type Props = {
  onUnblock: () => void;
};

export default function BlockedProfileNotice({ onUnblock }: Props) {
  const { t } = useTranslation();
  return (
    <div className="blocked-profile-notice">
      <Ban size={48} className="blocked-profile-notice__icon" aria-hidden="true" />
      <h3 className="blocked-profile-notice__title">
        {t("profile.blocked.title")}
      </h3>
      <p className="blocked-profile-notice__subtitle">
        {t("profile.blocked.subtitle")}
      </p>
      <button
        type="button"
        className="blocked-profile-notice__unblock-btn"
        onClick={onUnblock}
      >
        {t("profile.blocked.unblock")}
      </button>
    </div>
  );
}
