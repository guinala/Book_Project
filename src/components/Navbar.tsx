import "./Navbar.css";

interface NavLink {
  label: string;
  href: string;
}

interface NavbarProps {
  isAuthenticated?: boolean;
  user?: {
    name: string;
    avatarUrl?: string;
  };
}

const NAV_LINKS: NavLink[] = [
  { label: "Explorar", href: "/explore" },
  { label: "Listas", href: "/lists" },
  { label: "Comunidad", href: "/community" },
];

export default function Navbar({ isAuthenticated = false, user }: NavbarProps) {
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <header className="navbar">
      <div className="navbar__inner">

        <a className="navbar__logo" href="/">
          <span className="navbar__logo-icon">📖</span>
          <span className="navbar__logo-text">LibLand</span>
        </a>

        <nav className="navbar__nav">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="navbar__link">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="navbar__actions">
          {isAuthenticated && user ? (
            <div className="navbar__user-menu">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="navbar__avatar"
                />
              ) : (
                <div className="navbar__avatar">{getInitials(user.name)}</div>
              )}
              <span className="navbar__user-name">{user.name}</span>
            </div>
          ) : (
            <>
              <button className="navbar__btn-login">Iniciar sesión</button>
              <button className="navbar__btn-register">Registrarse</button>
            </>
          )}
        </div>

      </div>
    </header>
  );
}