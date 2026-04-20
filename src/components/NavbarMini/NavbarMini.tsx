import { useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import "./NavbarMini.scss";

const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const PeopleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

interface NavItem {
  labelKey: string;
  path: string;
  icon: ReactNode;
}

const ITEMS: NavItem[] = [
  { labelKey: "nav.myLibrary", path: "/my-library", icon: <BookIcon /> },
  { labelKey: "nav.explore",   path: "/explore",    icon: <SearchIcon /> },
  { labelKey: "nav.community", path: "/community",  icon: <PeopleIcon /> },
];

const activeFromPath = (pathname: string) => {
  if (pathname.startsWith("/book/")) return "/explore";
  return pathname;
};

interface NavbarMiniProps {
  visible: boolean;
}

export default function NavbarMini({ visible }: NavbarMiniProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const active = activeFromPath(pathname);

  return (
    <nav className={`navbar-mini${visible ? " navbar-mini--visible" : ""}`} aria-label="Navegación rápida">
      {ITEMS.map(({ labelKey, path, icon }) => (
        <button
          key={path}
          className={`navbar-mini__item${active === path ? " navbar-mini__item--active" : ""}`}
          onClick={() => navigate(path)}
        >
          {icon}
          <span className="navbar-mini__label">{t(labelKey)}</span>
        </button>
      ))}
    </nav>
  );
}
