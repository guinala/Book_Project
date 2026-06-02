import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { useAuth } from "@/context/auth/useAuth";
import AuthLayout from "@/layouts/AuthLayout";
import LoginForm from "@/components/auth/forms/LoginForm";
import RegisterForm from "@/components/auth/forms/RegisterForm";
import "./AuthForm.scss";

type FormScreen = "login" | "register";

export default function AuthForm() {
  const { t } = useTranslation();
  const { loading } = useAuth();
  const location = useLocation();
  const initialTab: FormScreen = (location.state as { tab?: FormScreen } | null)?.tab ?? "login";
  const [screen, setScreen] = useState<FormScreen>(initialTab);
  const [slideDir, setSlideDir] = useState<"left" | "right">("right");

  function goToLogin() {
    setSlideDir("left");
    setScreen("login");
  }

  function goToRegister() {
    setSlideDir("right");
    setScreen("register");
  }

  if (loading) {
    return (
      <AuthLayout>
        <p className="auth__loading">{t("auth.checkingCredentials")}</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="auth__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={screen === "login"}
          className={`auth__tab${screen === "login" ? " auth__tab--active" : ""}`}
          onClick={goToLogin}
        >
          {t("auth.tabLogin")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={screen === "register"}
          className={`auth__tab${screen === "register" ? " auth__tab--active" : ""}`}
          onClick={goToRegister}
        >
          {t("auth.tabRegister")}
        </button>
      </div>
      <div key={screen} className={`auth__slide auth__slide--${slideDir}`}>
        {screen === "login" ? <LoginForm /> : <RegisterForm />}
      </div>
    </AuthLayout>
  );
}