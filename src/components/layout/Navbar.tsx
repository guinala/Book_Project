import { useState, useRef } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/context/auth/useAuth";
import { useTranslation } from "react-i18next";
import ProfileMenu from "@/components/profile/sections/ProfileMenu";
import { Search, X, User } from "lucide-react";
import "./Navbar.scss";
import NotificationsBell from "../notifications/NotificationBell";

const NAV_LINKS = [
  { path: "/my-library", labelKey: "nav.myLibrary" },
  { path: "/explore",    labelKey: "nav.explore"   },
  { path: "/community",  labelKey: "nav.community" },
];

type NavbarProps = {
  hidden?: boolean;
  onActiveClick?: () => void;
}

export default function Navbar({ hidden = false, onActiveClick }: NavbarProps) {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
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
        </div>

        <nav className="navbar__nav">
          {NAV_LINKS.map(({ path, labelKey }) => (
            <NavLink key={path} to={path} className="navbar__link" onClick={(e) => {
              if(pathname === path) {
                e.preventDefault();
                onActiveClick?.();
              }
            }}>
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="navbar__actions">
          <div className="navbar__search-wrap" role="search">
            <Search size={20} className="navbar__search-wrap-icon" aria-hidden="true" />
            <input
              ref={searchInputRef}
              className="navbar__search-field-input"
              type="search"
              aria-label={t("navbar.search")}
              placeholder={t("navbar.search")}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onBlur={() => setSearchValue("")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchValue.trim()) {
                  navigate(`/search?q=${encodeURIComponent(searchValue.trim())}`);
                }
              }}
            />
            <button
              className={`navbar__search-clear-btn${searchValue ? " navbar__search-clear-btn--visible" : ""}`}
              type="button"
              aria-label="Cerrar búsqueda"
              onMouseDown={(e) => {
                e.preventDefault();
                setSearchValue("");
                searchInputRef.current?.blur();
              }}
            >
              <X size={16} />
            </button>
          </div>
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
