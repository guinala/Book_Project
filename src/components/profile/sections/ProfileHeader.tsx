import { useTranslation } from "react-i18next";
import ShareProfileButton from "../ShareProfileButton";
import ProfileActionsMenu from "../ProfileActionsMenu";
import "./ProfileHeader.scss";
import type { UserFullProfile } from "@/types/UserProfile";

type ProfileHeaderProps = {
  profile: UserFullProfile;
  isOwnProfile: boolean;
  isFollowing: boolean;
  hasPendingRequest: boolean;
  booksReadCount: number;
  onFollow: () => void;
  onUnfollow: () => void;
  onCancelRequest: () => void;
  onFollowersClick: () => void;
  onFollowingClick: () => void;
  onEditClick: () => void;
  onRequestsClick: () => void;
  onBlock: () => void;
  onBooksReadClick?: () => void;
};

export default function ProfileHeader({
  profile,
  isOwnProfile,
  isFollowing,
  hasPendingRequest,
  booksReadCount,
  onFollow,
  onUnfollow,
  onCancelRequest,
  onFollowersClick,
  onFollowingClick,
  onEditClick,
  onRequestsClick,
  onBlock,
  onBooksReadClick,
}: ProfileHeaderProps) {
  const { t } = useTranslation();
  const displayName = `${profile.name} ${profile.surname}`.trim() || profile.email;

  // Siguiendo / solicitado / sin relacion
  let followLabel = t("profile.header.follow");
  let followModifierClass = "profile-header__btn--follow";
  let followHandler = onFollow;

  if (isFollowing) {
    followLabel = t("profile.header.followingState");
    followModifierClass = "profile-header__btn--following";
    followHandler = onUnfollow;
  } else if (hasPendingRequest) {
    followLabel = t("profile.header.requested");
    followModifierClass = "profile-header__btn--pending";
    followHandler = onCancelRequest;
  }

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
            <span>{t("profile.header.changeCover")}</span>
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
                  <span>{t("profile.header.editPhoto")}</span>
                </div>
              )}
            </div>
          </div>

          <div className="profile-header__mid">
          <div className="profile-header__identity">
            <h2 className="profile-header__name">{displayName}</h2>
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
              <span className="profile-header__stat-count">{profile.followersCount}</span>
              <span className="profile-header__stat-label">
                {t("profile.header.followers", { count: profile.followersCount })}
              </span>
            </button>

            <div className="profile-header__stat-divider" aria-hidden="true" />

            <button
              type="button"
              className="profile-header__stat"
              onClick={onFollowingClick}
            >
              <span className="profile-header__stat-count">{profile.followingCount}</span>
              <span className="profile-header__stat-label">
                {t("profile.header.following", { count: profile.followingCount })}
              </span>
            </button>

            <div className="profile-header__stat-divider" aria-hidden="true" />

            <button
              type="button"
              className="profile-header__stat"
              onClick={onBooksReadClick}
              disabled={!onBooksReadClick}
            >
              <span className="profile-header__stat-count">{booksReadCount}</span>
              <span className="profile-header__stat-label">
                {t("profile.header.booksRead", { count: booksReadCount })}
              </span>
            </button>
          </div>
          </div>

          <div className="profile-header__actions">
            {isOwnProfile ? (
              <ShareProfileButton
                username={profile.username}
                name={displayName}
              />
            ) : (
              <ProfileActionsMenu
                username={profile.username}
                name={displayName}
                onBlock={onBlock}
              />
            )}
            {isOwnProfile ? (
              <>
                {profile.isPublic === false && (
                  <button
                    type="button"
                    className="profile-header__btn profile-header__btn--edit"
                    onClick={onRequestsClick}
                  >{t("profile.header.requests")}</button>
                )}
                <button
                  type="button"
                  className="profile-header__btn profile-header__btn--edit"
                  onClick={onEditClick}
                >
                  {t("profile.header.editProfile")}
                </button>
              </>
            ) : (
              <button
                type="button"
                className={`profile-header__btn ${followModifierClass}`}
                onClick={followHandler}
              >
                {followLabel}
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
