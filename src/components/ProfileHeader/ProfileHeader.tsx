// src/components/ProfileHeader/ProfileHeader.tsx
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
        className="profile-header__banner"
        style={
          profile.bannerImageUrl
            ? { backgroundImage: `url(${profile.bannerImageUrl})` }
            : undefined
        }
      />

      <div className="profile-header__info">
        <div className="profile-header__top-row">
          <div className="profile-header__avatar-wrap">
            {profile.profilePhotoUrl ? (
              <img
                className="profile-header__avatar"
                src={profile.profilePhotoUrl}
                alt={displayName}
              />
            ) : (
              <div className="profile-header__avatar profile-header__avatar--placeholder">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
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
              <span className="profile-header__stat-label">Libros leídos</span>
              <span className="profile-header__stat-value">{booksReadCount}</span>
            </div>
          </div>

          <div className="profile-header__actions">
            {isOwnProfile ? (
              <button
                type="button"
                className="profile-header__btn profile-header__btn--edit"
                onClick={onEditClick}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
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
