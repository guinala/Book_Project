import "./CommunityPage.scss";

export default function CommunityPage() {
  return (
    <main className="community-soon">
      <svg
        className="community-soon__icon"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      <p className="community-soon__title">Comunidad</p>
      <p className="community-soon__subtitle">Próximamente</p>
    </main>
  );
}
