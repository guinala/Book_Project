import { Link, NavLink } from "react-router";
import { NAV_LINKS } from "../../routes/routes";
import { useAuth } from "../../services/Auth";
import "./Navbar.scss";
import { useTranslation } from "react-i18next";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link className="navbar__brand" to="/">
          <div className="navbar__brand-img" />
          <span className="navbar__brand-name">Trama</span>
        </Link>

        <nav className="navbar__nav">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.path} to={link.path} className="navbar__link">
              {t(link.label)}
            </NavLink>
          ))}
        </nav>

        <div className="navbar__actions">
          {isAuthenticated ? (
            <>
              <button className="navbar__btn-register-reading" type="button">
                {t("navbar.register")}
              </button>
              <span className="navbar__action-text">{user?.email}</span>
              <button
                type="button"
                className="navbar__action-text navbar__action-link"
                onClick={logout}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                {t("navbar.logout")}
              </button>
            </>
          ) : (
            <NavLink
              to="/auth"
              className="navbar__action-text navbar__action-link"
            >
              {t("navbar.login")}
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}