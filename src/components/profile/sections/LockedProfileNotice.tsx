import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import "./LockedProfileNotice.scss";

type Props = { profileName: string };

export default function LockedProfileNotice({ profileName }: Props) {
  const { t } = useTranslation();
  return (
    <div className="locked-profile-notice">
      <Lock size={48} className="locked-profile-notice__icon" aria-hidden="true" />
      <h3 className="locked-profile-notice__title">
        {t("profile.locked.title")}
      </h3>
      <p className="locked-profile-notice__subtitle">
        {t("profile.locked.subtitle", { name: profileName })}
      </p>
    </div>
  );
}
