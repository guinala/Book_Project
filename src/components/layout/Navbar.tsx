import { useState } from "react";
import { Link, NavLink } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import ProfileMenu from "@/components/profile/sections/ProfileMenu";
import { BookOpen, Search, Users, Plus, Bell, User } from "lucide-react";
import "./Navbar.scss";

const NAV_LINKS = [
  { path: "/my-library", labelKey: "nav.myLibrary", icon: <BookOpen /> },
  { path: "/explore",    labelKey: "nav.explore",   icon: <Search /> },
  { path: "/community",  labelKey: "nav.community", icon: <Users /> },
];

interface NavbarProps {
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
        <Link className="navbar__brand" to="/">
          <span className="navbar__brand-name">Trama</span>
        </Link>

        <nav className="navbar__nav">
          {NAV_LINKS.map(({ path, labelKey, icon }) => (
            <NavLink key={path} to={path} className="navbar__link">
              <span className="navbar__link-icon">{icon}</span>
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="navbar__actions">
          <button className="navbar__btn-register" type="button" aria-label={t("navbar.register")}>
            <Plus />
            <span className="navbar__btn-register-text" aria-hidden="true">{t("navbar.register")}</span>
          </button>
          <button className="navbar__btn-icon" type="button" aria-label={t("navbar.notifications")}>
            <Bell />
          </button>
          <div className="navbar__avatar-wrap">
            {isAuthenticated ? (
              <button
                className="navbar__btn-icon navbar__btn-icon--avatar"
                type="button"
                aria-label={t("navbar.profile")}
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
