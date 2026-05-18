import { useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { BookOpen, Search, Users } from "lucide-react";
import "./NavbarMini.scss";

interface NavItem {
  labelKey: string;
  path: string;
  icon: ReactNode;
}

const ITEMS: NavItem[] = [
  { labelKey: "nav.myLibrary", path: "/my-library", icon: <BookOpen /> },
  { labelKey: "nav.explore",   path: "/explore",    icon: <Search /> },
  { labelKey: "nav.community", path: "/community",  icon: <Users /> },
];

const activeFromPath = (pathname: string) => {
  if (pathname.startsWith("/books/")) return "/explore";
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
          aria-label={t(labelKey)}
        >
          {icon}
        </button>
      ))}
    </nav>
  );
}
