import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../services/Auth";
import { useEffect } from "react";
import "./LandingPage.scss";

function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/my-library", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLogin = () => {
    navigate("/auth");
  };

  const handleGuest = () => {
    navigate("/explore");
  };

  if (loading) {
    return (
      <div className="landing">
        <p className="landing__loading">{t("landing.checkingSession")}</p>
      </div>
    );
  }

  return (
    <div className="landing">
      <div className="landing__content">
        <span className="landing__icon">📖</span>
        <h1 className="landing__title">{t("landing.title")}</h1>
        <p className="landing__subtitle">{t("landing.subtitle")}</p>

        <div className="landing__actions">
          <button
            type="button"
            className="landing__btn-login"
            onClick={handleLogin}
          >
            {t("landing.loginBtn")}
          </button>
          <button
            type="button"
            className="landing__btn-guest"
            onClick={handleGuest}
          >
            {t("landing.guestBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;