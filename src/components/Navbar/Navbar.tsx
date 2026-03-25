import { Link, NavLink } from "react-router";
import { NAV_LINKS } from "../../routes/routes";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.scss";
import { useTranslation } from "react-i18next";

import LOGO_ICON from"../../assets/Logo.png";
import ICON_PLUS from "../../assets/plusIcon.png";
import ICON_NOTIF from "../../assets/notifIcon.png";
import ICON_AVATAR from "../../assets/ProfileIcon.png";
import LIBRARY_ICON from "../../assets/libraryIcon.png";
import EXPLORE_ICON from "../../assets/exploreIcon.png";
import COMMUNITY_ICON from "../../assets/communityIcon.png";

const NAV_ICONS: Record<string, string> = {
  "/my-library": LIBRARY_ICON,
  "/explore":    EXPLORE_ICON,
  "/community":  COMMUNITY_ICON,
};

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link className="navbar__brand" to="/">
          <img className="navbar__brand-img" src={LOGO_ICON} alt="Trama logo" />
          <span className="navbar__brand-name">Trama</span>
        </Link>

        <nav className="navbar__nav">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.path} to={link.path} className="navbar__link">
              {NAV_ICONS[link.path] && (
                <img className="navbar__link-icon" src={NAV_ICONS[link.path]} alt="" />
              )}
              {t(link.label)}
            </NavLink>
          ))}
        </nav>

        <div className="navbar__actions">
          {isAuthenticated ? (
            <>
              <button className="navbar__btn-register" type="button">
                <img src={ICON_PLUS} alt="" />
                {t("navbar.register")}
              </button>
              <button className="navbar__btn-icon" type="button" aria-label="Notificaciones">
                <img src={ICON_NOTIF} alt="" />
              </button>
              <button
                className="navbar__btn-icon navbar__btn-icon--avatar"
                type="button"
                aria-label="Perfil"
                onClick={logout}
              >
                <img src={ICON_AVATAR} alt="" />
              </button>
            </>
          ) : (
            <NavLink to="/auth" className="navbar__action-link">
              {t("navbar.login")}
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
