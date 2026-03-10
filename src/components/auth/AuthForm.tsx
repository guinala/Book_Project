import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../../services/firebase_init";
import "./AuthForm.scss";

type Screen = "loading" | "login" | "register" | "user";

export default function Auth() {
  const { t } = useTranslation();

  const [screen, setScreen] = useState<Screen>("loading");
  const [user, setUser] = useState<User | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerError, setRegisterError] = useState("");

  const [googleError, setGoogleError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function getErrorMessage(errorCode: string): string {
    const key = `authErrors.${errorCode}`;
    const translated = t(key);
    return translated === key
      ? t("authErrors.default", { code: errorCode })
      : translated;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setScreen("user");
      } else {
        setUser(null);
        setScreen("login");
      }
    });
    return () => unsubscribe();
  }, []);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegisterError("");
    setIsSubmitting(true);
    try {
      await createUserWithEmailAndPassword(
        auth,
        registerEmail,
        registerPassword,
      );
    } catch (error: any) {
      setRegisterError(getErrorMessage(error.code));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (error: any) {
      setLoginError(getErrorMessage(error.code));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogle() {
    setGoogleError("");
    setIsSubmitting(true);
    try {
      const googleProvider = new GoogleAuthProvider();
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      setGoogleError(getErrorMessage(error.code));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      setLoginEmail("");
      setLoginPassword("");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  function getCredentials(email: string): string {
    return email.charAt(0).toUpperCase();
  }

  function getProviderName(u: User): string {
    const providerId = u.providerData[0]?.providerId;
    return providerId === "google.com"
      ? t("auth.providerGoogle")
      : t("auth.providerEmail");
  }

  return (
    <div className="auth">
      <div className="auth__box">
        <a href="/" className="auth__logo">
          <span className="auth__logo-icon">📖</span>
          <span className="auth__logo-text">{t("auth.brandName")}</span>
        </a>

        {/* ─── Loading ─── */}
        <div className={screen !== "loading" ? "auth__hidden" : ""}>
          <p className="auth__loading">{t("auth.checkingCredentials")}</p>
        </div>

        {/* ─── Login ─── */}
        <div className={screen !== "login" ? "auth__hidden" : ""}>
          <h2 className="auth__title">{t("auth.loginTitle")}</h2>

          <form className="auth__form" onSubmit={handleLogin}>
            <input
              className="auth__input"
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />
            <input
              className="auth__input"
              type="password"
              placeholder={t("auth.passwordPlaceholder")}
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
            <button
              className="auth__btn-primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("auth.loggingIn") : t("auth.loginBtn")}
            </button>
            <p className="auth__error">{loginError}</p>
          </form>

          <div className="auth__divider">{t("auth.dividerOr")}</div>

          <button
            className="auth__btn-google"
            type="button"
            onClick={handleGoogle}
            disabled={isSubmitting}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
            />
            {t("auth.googleBtn")}
          </button>
          <p className="auth__error">{googleError}</p>

          <p className="auth__toggle">
            {t("auth.noAccount")}{" "}
            <span
              className="auth__toggle-link"
              onClick={() => {
                setScreen("register");
                setRegisterError("");
                setGoogleError("");
              }}
            >
              {t("auth.registerLink")}
            </span>
          </p>
        </div>

        {/* ─── Register ─── */}
        <div className={screen !== "register" ? "auth__hidden" : ""}>
          <h2 className="auth__title">{t("auth.registerTitle")}</h2>

          <form className="auth__form" onSubmit={handleRegister}>
            <input
              className="auth__input"
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              required
            />
            <input
              className="auth__input"
              type="password"
              placeholder={t("auth.passwordHint")}
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              required
            />
            <button
              className="auth__btn-primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("auth.registering") : t("auth.registerBtn")}
            </button>
            <p className="auth__error">{registerError}</p>
          </form>

          <div className="auth__divider">{t("auth.dividerOr")}</div>

          <button
            className="auth__btn-google"
            type="button"
            onClick={handleGoogle}
            disabled={isSubmitting}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
            />
            {t("auth.googleBtn")}
          </button>
          <p className="auth__error">{googleError}</p>

          <p className="auth__toggle">
            {t("auth.hasAccount")}{" "}
            <span
              className="auth__toggle-link"
              onClick={() => {
                setScreen("login");
                setLoginError("");
                setGoogleError("");
              }}
            >
              {t("auth.loginLink")}
            </span>
          </p>
        </div>

        {/* ─── User ─── */}
        <div className={screen !== "user" ? "auth__hidden" : ""}>
          <div className="auth__user-info">
            <div className="auth__user-avatar">
              {user ? getCredentials(user.email ?? "U") : "U"}
            </div>
            <h2 className="auth__title">{t("auth.welcome")}</h2>
            <p className="auth__user-email">{user?.email}</p>
            <p className="auth__user-provider">
              {t("auth.provider", {
                provider: user ? getProviderName(user) : "",
              })}
            </p>
            <button
              className="auth__btn-danger"
              type="button"
              onClick={handleLogout}
            >
              {t("navbar.logout")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
