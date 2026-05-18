import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import AuthLayout from "@/layouts/AuthLayout";
import LoginForm from "@/components/auth/forms/LoginForm";
import RegisterForm from "@/components/auth/forms/RegisterForm";
import "./AuthForm.scss";

type FormScreen = "login" | "register";

export default function AuthForm() {
  const { t } = useTranslation();
  const { loading } = useAuth();
  const [screen, setScreen] = useState<FormScreen>("login");

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
          onClick={() => setScreen("login")}
        >
          {t("auth.tabLogin")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={screen === "register"}
          className={`auth__tab${screen === "register" ? " auth__tab--active" : ""}`}
          onClick={() => setScreen("register")}
        >
          {t("auth.tabRegister")}
        </button>
      </div>
      {screen === "login" ? <LoginForm /> : <RegisterForm />}
    </AuthLayout>
  );
}