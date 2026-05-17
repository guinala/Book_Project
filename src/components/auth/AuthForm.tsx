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
      {screen === "login" ? (
        <LoginForm onSwitchToRegister={() => setScreen("register")} />
      ) : (
        <RegisterForm onSwitchToLogin={() => setScreen("login")} />
      )}
    </AuthLayout>
  );
}