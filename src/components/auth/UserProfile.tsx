import { useTranslation } from "react-i18next";
import type { User } from "firebase/auth";
import { useAuth } from "../../context/AuthContext";

export default function UserProfile() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  if (!user) return null;

  function getInitial(u: User): string {
    return (u.email ?? "U").charAt(0).toUpperCase();
  }

  function getProviderName(u: User): string {
    const providerId = u.providerData[0]?.providerId;
    return providerId === "google.com"
      ? t("auth.providerGoogle")
      : t("auth.providerEmail");
  }

  return (
    <div className="auth__user-info">
      <div className="auth__user-avatar">{getInitial(user)}</div>
      <h2 className="auth__title">{t("auth.welcome")}</h2>
      <p className="auth__user-email">{user.email}</p>
      <p className="auth__user-provider">
        {t("auth.provider", { provider: getProviderName(user) })}
      </p>
      <button
        className="auth__btn-danger"
        type="button"
        onClick={logout}
      >
        {t("navbar.logout")}
      </button>
    </div>
  );
}