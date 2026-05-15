import { Lock } from "lucide-react";
import "./LockedProfileNotice.scss";

type Props = { profileName: string };

export default function LockedProfileNotice({ profileName }: Props) {
  return (
    <div className="locked-profile-notice">
      <Lock size={48} className="locked-profile-notice__icon" aria-hidden="true" />
      <h3 className="locked-profile-notice__title">Este perfil es privado</h3>
      <p className="locked-profile-notice__subtitle">
        Sigue a {profileName} para ver su actividad y estantería
      </p>
    </div>
  );
}
