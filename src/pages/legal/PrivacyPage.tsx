import { useTranslation } from "react-i18next";
import "./LegalDocument.scss";

type LegalSection = {
  heading: string;
  body: string;
};

const LAST_UPDATED = "2026-05-24";

export default function PrivacyPage() {
  const { t } = useTranslation();
  const sections = t("legal.privacy.sections", { returnObjects: true }) as LegalSection[];

  return (
    <article className="legal-document">
      <h1 className="legal-document__title">{t("legal.privacy.title")}</h1>
      <p className="legal-document__updated">
        {t("legal.lastUpdated", { date: LAST_UPDATED })}
      </p>
      {sections.map((section) => (
        <section key={section.heading} className="legal-document__section">
          <h2 className="legal-document__section-heading">{section.heading}</h2>
          <p className="legal-document__section-body">{section.body}</p>
        </section>
      ))}
    </article>
  );
}
