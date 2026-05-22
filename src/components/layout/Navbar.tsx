import { useState } from "react";
import { Link, NavLink } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import ProfileMenu from "@/components/profile/sections/ProfileMenu";
import { Search, Plus, User } from "lucide-react";
import "./Navbar.scss";
import NotificationsBell from "../notifications/NotificationBell";

const NAV_LINKS = [
  { path: "/my-library", labelKey: "nav.myLibrary" },
  { path: "/explore",    labelKey: "nav.explore"   },
  { path: "/community",  labelKey: "nav.community" },
];

type NavbarProps = {
  hidden?: boolean;
}

export default function Navbar({ hidden = false }: NavbarProps) {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [prevHidden, setPrevHidden] = useState(hidden);
  if (hidden !== prevHidden) {
    setPrevHidden(hidden);
    if (hidden) setMenuOpen(false);
  }

  return (
    <header className={`navbar${hidden ? " navbar--hidden" : ""}`}>
      <div className="navbar__inner">
        <div className="navbar__left">
          <Link
            className="navbar__brand"
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <span className="navbar__brand-name">Trama</span>
          </Link>
          <form className="navbar__search" role="search">
            <Search size={14} className="navbar__search-icon" aria-hidden="true" />
            <input
              className="navbar__search-input"
              type="search"
              aria-label={t("navbar.search")}
              placeholder={t("navbar.search")}
            />
          </form>
        </div>

        <nav className="navbar__nav">
          {NAV_LINKS.map(({ path, labelKey }) => (
            <NavLink key={path} to={path} className="navbar__link">
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="navbar__actions">
          <button className="navbar__btn-register" type="button" aria-label={t("navbar.register")}>
            <Plus />
            <span className="navbar__btn-register-text" aria-hidden="true">{t("navbar.register")}</span>
          </button>
          {isAuthenticated && <NotificationsBell />}
          <div className="navbar__avatar-wrap">
            {isAuthenticated ? (
              <button
                className="navbar__btn-icon navbar__btn-icon--avatar"
                type="button"
                aria-label={t("navbar.profile")}
                aria-haspopup="true"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(o => !o)}
              >
                <User size={18} />
              </button>
            ) : (
              <NavLink to="/auth" className="navbar__btn-icon navbar__btn-icon--avatar">
                <User size={18} />
              </NavLink>
            )}
            {menuOpen && <ProfileMenu onClose={() => setMenuOpen(false)} />}
          </div>
        </div>
      </div>
    </header>
  );
}
