import { useState, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import ProfileMenu from "@/components/profile/sections/ProfileMenu";
import { Search, X, Bell, User } from "lucide-react";
import "./Navbar.scss";

const NAV_LINKS = [
  { path: "/my-library", labelKey: "nav.myLibrary" },
  { path: "/explore",    labelKey: "nav.explore"   },
  { path: "/community",  labelKey: "nav.community" },
];

interface NavbarProps {
  hidden?: boolean;
}

export default function Navbar({ hidden = false }: NavbarProps) {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
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
            <NavLink key={path} to={path} className="navbar__link">
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
              <X size={14} />
            </button>
          </div>
          <button className="navbar__btn-icon" type="button" aria-label={t("navbar.notifications")}>
            <Bell />
          </button>
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
