import { Users } from "lucide-react";
import "./CommunityPage.scss";

export default function CommunityPage() {
  return (
    <main className="community-soon">
      <Users className="community-soon__icon" size={48} strokeWidth={1.5} />
      <p className="community-soon__title">Comunidad</p>
      <p className="community-soon__subtitle">Próximamente</p>
    </main>
  );
}
