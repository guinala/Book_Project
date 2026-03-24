import { useTranslation } from "react-i18next";

export default function AuthDivider() {
  const { t } = useTranslation();

  return <div className="auth__divider">{t("auth.dividerOr")}</div>;
}