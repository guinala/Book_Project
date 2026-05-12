import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { User, Settings, Moon, Sun, LogOut } from "lucide-react";
import "./ProfileMenu.scss";

interface ProfileMenuProps {
  onClose: () => void;
}

export default function ProfileMenu({ onClose }: ProfileMenuProps) {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="profile-menu" ref={ref}>
      <Link
        className="profile-menu__item"
        to="/profile"
        onClick={onClose}
      >
        <User />
        Ver perfil
      </Link>

      <Link className="profile-menu__item" to="/settings" onClick={onClose}>
        <Settings />
        Ajustes
      </Link>

      <button className="profile-menu__item" type="button" onClick={toggleTheme}>
        {theme === "light" ? <Moon /> : <Sun />}
        {theme === "light" ? "Tema oscuro" : "Tema claro"}
      </button>

      <div className="profile-menu__divider" />

      <button
        className="profile-menu__item profile-menu__item--danger"
        type="button"
        onClick={() => { logout(); onClose(); }}
      >
        <LogOut />
        Cerrar sesión
      </button>
    </div>
  );
}
