import "./Footer.css";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Descubrir",
    links: [
      { label: "Explorar libros", href: "/explore" },
      { label: "Géneros", href: "/genres" },
      { label: "Listas populares", href: "/lists" },
      { label: "Tendencias", href: "/trending" },
    ],
  },
  {
    title: "Comunidad",
    links: [
      { label: "Reseñas recientes", href: "/reviews" },
      { label: "Clubes de lectura", href: "/clubs" },
      { label: "Retos de lectura", href: "/challenges" },
      { label: "Foro", href: "/forum" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { label: "Sobre nosotros", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Contacto", href: "/contact" },
      { label: "Prensa", href: "/press" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacidad", href: "/privacy" },
      { label: "Términos de uso", href: "/terms" },
      { label: "Cookies", href: "/cookies" },
      { label: "Accesibilidad", href: "/accessibility" },
    ],
  },
];

const SOCIAL_LINKS = [
  { label: "Twitter / X", icon: "𝕏", href: "https://twitter.com" },
  { label: "Instagram", icon: "📷", href: "https://instagram.com" },
  { label: "Goodreads", icon: "📚", href: "https://goodreads.com" },
];

export default function Footer() {
  return (
    <footer className="footer">

      <div className="footer__top">

        {/* Brand column */}
        <div className="footer__brand">
          <a href="/" className="footer__brand-logo">
            <span className="footer__brand-icon">📖</span>
            <span className="footer__brand-name">Biblós</span>
          </a>
          <p className="footer__brand-tagline">
            Tu compañero de lectura. Descubre, organiza y comparte los libros
            que dan forma a tu mundo.
          </p>
          <div className="footer__social-row">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                className="footer__social-btn"
                aria-label={s.label}
                target="_blank"
                rel="noopener noreferrer"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Nav columns */}
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title} className="footer__column">
            <p className="footer__column-title">{col.title}</p>
            {col.links.map((link) => (
              <a key={link.href} href={link.href} className="footer__column-link">
                {link.label}
              </a>
            ))}
          </div>
        ))}

      </div>

      <hr className="footer__divider" />

      {/* Bottom bar */}
      <div className="footer__bottom">
        <span className="footer__copyright">
          © {new Date().getFullYear()} Biblós · Todos los derechos reservados
        </span>
        <button type="button" className="footer__language-btn">
          🌐 Español
        </button>
      </div>

    </footer>
  );
}