// src/components/ProfileHeader/ProfileHeader.tsx
import ShareProfileButton from "../ShareProfileButton";
import "./ProfileHeader.scss";
import type { UserFullProfile } from "@/types/UserProfile";

type ProfileHeaderProps = {
  profile: UserFullProfile;
  isOwnProfile: boolean;
  isFollowing: boolean;
  booksReadCount: number;
  onFollow: () => void;
  onUnfollow: () => void;
  onFollowersClick: () => void;
  onFollowingClick: () => void;
  onEditClick: () => void;
};

export default function ProfileHeader({
  profile,
  isOwnProfile,
  isFollowing,
  booksReadCount,
  onFollow,
  onUnfollow,
  onFollowersClick,
  onFollowingClick,
  onEditClick,
}: ProfileHeaderProps) {
  const displayName = `${profile.name} ${profile.surname}`.trim() || profile.email;

  return (
    <div className="profile-header">
      <div
        className={`profile-header__banner${isOwnProfile ? " profile-header__banner--editable" : ""}`}
        style={
          profile.bannerImageUrl
            ? { backgroundImage: `url(${profile.bannerImageUrl})` }
            : undefined
        }
        onClick={isOwnProfile ? onEditClick : undefined}
      >
        {isOwnProfile && (
          <div className="profile-header__banner-overlay">
            <span>Cambiar portada</span>
          </div>
        )}
      </div>

      <div className="profile-header__info">
        <div className="profile-header__top-row">
          <div className="profile-header__avatar-wrap">
            <div
              className={`profile-header__avatar-frame${isOwnProfile ? " profile-header__avatar-frame--editable" : ""}`}
              onClick={isOwnProfile ? onEditClick : undefined}
            >
              {profile.profilePhotoUrl ? (
                <img
                  className="profile-header__avatar"
                  src={profile.profilePhotoUrl}
                  alt={displayName}
                />
              ) : (
                <div className="profile-header__avatar profile-header__avatar--placeholder">
                  {(displayName.charAt(0) || "U").toUpperCase()}
                </div>
              )}
              {isOwnProfile && (
                <div className="profile-header__avatar-overlay">
                  <span>Editar</span>
                </div>
              )}
            </div>
          </div>

          <div className="profile-header__identity">
            <h1 className="profile-header__name">{displayName}</h1>
            {profile.username && (
              <p className="profile-header__handle">@{profile.username}</p>
            )}
          </div>

          <div className="profile-header__stats">
            <button
              type="button"
              className="profile-header__stat"
              onClick={onFollowersClick}
            >
              <span className="profile-header__stat-label">Seguidores</span>
              <span className="profile-header__stat-value">
                {profile.followersCount}
              </span>
            </button>

            <div className="profile-header__stat-divider" aria-hidden="true" />

            <button
              type="button"
              className="profile-header__stat"
              onClick={onFollowingClick}
            >
              <span className="profile-header__stat-label">Seguidos</span>
              <span className="profile-header__stat-value">
                {profile.followingCount}
              </span>
            </button>

            <div className="profile-header__stat-divider" aria-hidden="true" />

            <div className="profile-header__stat">
              <span className="profile-header__stat-label">Libros acabados</span>
              <span className="profile-header__stat-value">{booksReadCount}</span>
            </div>
          </div>

          <div className="profile-header__actions">
            <ShareProfileButton
              username={profile.username}
              name={displayName}
            />
            {isOwnProfile ? (
              <button
                type="button"
                className="profile-header__btn profile-header__btn--edit"
                onClick={onEditClick}
              >
                Editar perfil
              </button>
            ) : (
              <button
                type="button"
                className={`profile-header__btn ${
                  isFollowing
                    ? "profile-header__btn--following"
                    : "profile-header__btn--follow"
                }`}
                onClick={isFollowing ? onUnfollow : onFollow}
              >
                {isFollowing ? "Siguiendo" : "Seguir"}
              </button>
            )}
          </div>
        </div>

        {profile.bio && (
          <p className="profile-header__bio">{profile.bio}</p>
        )}
      </div>
    </div>
  );
}
