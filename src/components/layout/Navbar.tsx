import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/context/auth/useAuth";
import { useTranslation } from "react-i18next";
import ProfileMenu from "@/components/profile/sections/ProfileMenu";
import { Search, X, User } from "lucide-react";
import "./Navbar.scss";
import NotificationsBell from "../notifications/NotificationBell";
import { searchBooksInDB } from "@/services/firebase/firebaseBooks";
import type { Book } from "@/types/Book";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import { encodeKey } from "@/utils/bookPaths";

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

  const { lang } = useCurrentLanguage();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<Book[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const trimmed = searchValue.trim();
    if (trimmed.length < 3) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchBooksInDB(trimmed, "todo", lang, 6);
        if (!cancelled) setSuggestions(results);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [searchValue, lang]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const goToResults = () => {
    const trimmed = searchValue.trim();
    if (trimmed.length < 3) return;
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

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
          <div className="navbar__search-wrap" role="search" ref={wrapRef}>
            <Search size={20} className="navbar__search-wrap-icon" aria-hidden="true" />
            <input
              ref={searchInputRef}
              className="navbar__search-field-input"
              type="search"
              aria-label={t("navbar.search")}
              placeholder={t("navbar.search")}
              value={searchValue}
              onChange={(e) => {
                const v = e.target.value;
                setSearchValue(v);
                if (v.trim().length >= 3) {
                  setOpen(true);
                  setLoadingSuggestions(true);
                } else {
                  setOpen(false);
                  setSuggestions([]);
                }
              }}
              onBlur={() => window.setTimeout(() => setOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goToResults();
                if (e.key === "Escape") setOpen(false);
              }}
            />
            <button
              className={`navbar__search-clear-btn${searchValue ? " navbar__search-clear-btn--visible" : ""}`}
              type="button"
              aria-label="Cerrar búsqueda"
              onMouseDown={(e) => {
                e.preventDefault();
                setSearchValue("");
                setSuggestions([]);
                setOpen(false);
                searchInputRef.current?.blur();
              }}
            >
              <X size={16} />
            </button>

            {open && searchValue.trim().length >= 3 && (
              <div className="navbar__search-dropdown" role="listbox">
                {loadingSuggestions ? (
                  <p className="navbar__search-dropdown-status">{t("explore.searching")}</p>
                ) : suggestions.length === 0 ? (
                  <p className="navbar__search-dropdown-status">{t("myLibrary.noResults")}</p>
                ) : (
                  <>
                    {suggestions.map((book) => (
                      <Link
                        key={book.key}
                        to={`/books/${encodeKey(book.key)}`}
                        className="navbar__search-dropdown-item"
                        role="option"
                        onClick={() => { setOpen(false); setSearchValue(""); }}
                      >
                        {book.cover_url && (
                          <img src={book.cover_url} alt="" className="navbar__search-dropdown-cover" />
                        )}
                        <span className="navbar__search-dropdown-text">
                          <span className="navbar__search-dropdown-title">{book.title}</span>
                          <span className="navbar__search-dropdown-author">{book.authors?.[0]}</span>
                        </span>
                      </Link>
                    ))}
                    <button type="button" className="navbar__search-dropdown-more" onClick={goToResults}>
                      {t("search.seeAllResults")}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          {isAuthenticated && <NotificationsBell />}
          <div className="navbar__avatar-wrap">
            {isAuthenticated ? (
              <button
                className="navbar__btn-icon navbar__btn-icon--avatar"
                type="button"
                aria-label={t("navbar.profile")}
                aria-haspopup="true"
                aria-expanded={menuOpen && !hidden}
                onClick={() => setMenuOpen(o => !o)}
              >
                <User size={18} />
              </button>
            ) : (
              <NavLink to="/auth" className="navbar__btn-icon navbar__btn-icon--avatar">
                <User size={18} />
              </NavLink>
            )}
            {menuOpen && !hidden && <ProfileMenu onClose={() => setMenuOpen(false)} />}
          </div>
        </div>
      </div>
    </header>
  );
}
