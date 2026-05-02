// src/components/ProfileCard/ProfileCard.tsx
import { useNavigate } from "react-router";
import type { UserMinimal } from "@/types/UserProfile";
import "./ProfileCard.scss";

type ProfileCardProps = {
  user: UserMinimal;
  onClose?: () => void;
};

export default function ProfileCard({ user, onClose }: ProfileCardProps) {
  const navigate = useNavigate();
  const displayName = user.name || user.username || "Usuario";

  const handleClick = () => {
    onClose?.();
    navigate(`/profile/${user.uid}`);
  };

  return (
    <button type="button" className="profile-card" onClick={handleClick}>
      {user.profilePhotoUrl ? (
        <img
          className="profile-card__avatar"
          src={user.profilePhotoUrl}
          alt={displayName}
        />
      ) : (
        <div className="profile-card__avatar profile-card__avatar--placeholder">
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="profile-card__info">
        <p className="profile-card__name">{displayName}</p>
        {user.username && (
          <p className="profile-card__handle">@{user.username}</p>
        )}
      </div>
    </button>
  );
}
