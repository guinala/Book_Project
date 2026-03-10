import { Link, NavLink } from "react-router";
import { NAV_LINKS } from "../../routes/routes";
import { useAuth } from "../../services/Auth";
import "./Navbar.scss";
import { useTranslation } from "react-i18next";

const LOGO_ICON     = "https://www.figma.com/api/mcp/asset/0af8ed5e-dd51-4237-8b2d-4afe574bf930";
const ICON_PLUS     = "https://www.figma.com/api/mcp/asset/132e32e7-f96b-43bf-a41b-1117d9457fc7";
const ICON_NOTIS    = "https://www.figma.com/api/mcp/asset/f89d191c-bbf4-4466-93cc-58ad55f1ac37";
const ICON_AVATAR   = "https://www.figma.com/api/mcp/asset/9643682f-1853-4a83-9161-56af2398b84b";

const NAV_ICONS: Record<string, string> = {
  "/my-library": "https://www.figma.com/api/mcp/asset/a866ecd2-9b1c-464d-ace7-7ae9dc309972",
  "/explore":    "https://www.figma.com/api/mcp/asset/b85c83bb-dcc2-44ea-910f-f5c7879f602f",
  "/community":  "https://www.figma.com/api/mcp/asset/73caa4c1-1c24-4c91-b006-7ad24cbe8d48",
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
                <img src={ICON_NOTIS} alt="" />
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
