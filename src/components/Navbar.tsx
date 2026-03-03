import { Link, NavLink } from "react-router";
import { NAV_LINKS } from "../routes/routes";
import "../styles/css/components/Navbar.css";

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar__inner">

        <Link className="navbar__brand" to="/">
          <div className="navbar__brand-img" />
          <span className="navbar__brand-name">Trama</span>
        </Link>

        <nav className="navbar__nav">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.path} to={link.path} className="navbar__link">
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar__actions">
          <button className="navbar__btn-register-reading" type="button">
            Registrar lectura
          </button>
          <span className="navbar__action-text">Notificaciones</span>
          <span className="navbar__action-text">Perfil</span>
        </div>

      </div>
    </header>
  );
}
