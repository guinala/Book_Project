import { useTranslation } from "react-i18next";
import "./Footer.scss";
import { Link } from "react-router";

const SOCIAL_LINKS = [
  { key: "instagram", href: "#" },
  { key: "facebook", href: "#" },
  { key: "tiktok", href: "#" },
  { key: "x", href: "#" },
] as const;

const COMPANY_LINKS = [
  { key: "contact", href: "#", internal: false },
  { key: "about", href: "#", internal: false },
  { key: "privacy", href: "/legal/privacy", internal: true },
] as const;

const LEGAL_LINKS = [
  { key: "legalNotice", href: "/legal/terms", internal: true },
  { key: "cookies", href: "#", internal: false },
] as const;

const SUPPORT_LINKS = [
  { key: "supportContact", href: "#" },
  { key: "sponsorship", href: "#" },
] as const;

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="footer">
      <div className="footer__inner">
        <nav className="footer__columns" aria-label={t("footer.aria.nav")}>
          <section className="footer__column">
            <h3 className="footer__heading">{t("footer.columns.social")}</h3>
            <ul className="footer__list">
              {SOCIAL_LINKS.map(({ key, href }) => (
                <li key={key}>
                  <a
                    className="footer__link"
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {t(`footer.links.${key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="footer__column">
            <h3 className="footer__heading">{t("footer.columns.company")}</h3>
            <ul className="footer__list">
              {COMPANY_LINKS.map(({ key, href, internal }) => (
                <li key={key}>
                  {internal ? (
                    <Link className="footer__link" to={href}>
                      {t(`footer.links.${key}`)}
                    </Link>
                  ) : (
                    <a className="footer__link" href={href}>
                      {t(`footer.links.${key}`)}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="footer__column">
            <h3 className="footer__heading">{t("footer.columns.legal")}</h3>
            <ul className="footer__list">
              {LEGAL_LINKS.map(({ key, href, internal }) => (
                <li key={key}>
                  {internal ? (
                    <Link className="footer__link" to={href}>
                      {t(`footer.links.${key}`)}
                    </Link>
                  ) : (
                    <a className="footer__link" href={href}>
                      {t(`footer.links.${key}`)}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="footer__column">
            <h3 className="footer__heading">{t("footer.columns.support")}</h3>
            <ul className="footer__list">
              {SUPPORT_LINKS.map(({ key, href }) => (
                <li key={key}>
                  <a className="footer__link" href={href}>
                    {t(`footer.links.${key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </nav>

        <div className="footer__brand-mark" aria-hidden="true">
          {t("footer.brandMark")}
        </div>
      </div>
    </footer>
  );
}
