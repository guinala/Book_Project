import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="auth">
      <div className="auth__box">
        <a href="/" className="auth__logo">
          <span className="auth__logo-text">{t("auth.brandName")}</span>
        </a>
        {children}
      </div>
    </div>
  );
}