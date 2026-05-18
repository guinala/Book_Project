import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import "./ExploreConversionBanner.scss";

export default function ExploreConversionBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="explore-banner">
      <div className="explore-banner__content">
        <p className="explore-banner__title">{t("explore.banner.title")}</p>
        <p className="explore-banner__body">{t("explore.banner.body")}</p>
      </div>
      <button
        type="button"
        className="explore-banner__cta"
        onClick={() => navigate("/auth")}
      >
        {t("explore.banner.cta")}
      </button>
    </div>
  );
}
