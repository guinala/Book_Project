import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@/context/auth/useAuth";
import { useProfile } from "@/pages/profile/hooks/useProfile";
import ProfileHeader from "@/components/profile/sections/ProfileHeader";
import FavoriteBooksSection from "@/components/profile/sections/FavoriteBooksSection";
import FavoriteBooksEditorModal from "@/components/profile/modals/FavoriteBooksEditorModal";
import ShelfSection from "@/components/shelf/sections/ShelfSection";
import ActivitySection from "@/components/profile/sections/ActivitySection";
import ListsSection from "@/components/shelf/sections/ListsSection";
import FollowersModal from "@/components/profile/modals/FollowersModal";
import type { FavoriteBook } from "@/types/UserProfile";
import "./ProfilePage.scss";
import LockedProfileNotice from "@/components/profile/sections/LockedProfileNotice";
import BlockedProfileNotice from "@/components/profile/sections/BlockedProfileNotice";
import { lookupUidByUsername } from "@/services/firebase/firebaseUsernames";
import FollowRequestsModal from "@/components/profile/modals/FollowRequestsModal";
import ListEditorModal from "@/components/shelf/modals/ListEditorModal";
import { useLists } from "@/hooks/useLists";
import { useFollowActions } from "@/hooks/useFollowActions";
import { useProfileShelf } from "@/pages/profile/hooks/useProfileShelf";
import { useProfileActivity } from "@/pages/profile/hooks/useProfileActivity";
import { useBlockActions } from "@/hooks/useBlockActions";

export default function ProfilePage() {
  const { userId: paramUserId, username: paramUsername } = useParams<{
    userId?: string;
    username?: string;
  }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [resolveState, setResolveState] = useState<"loading" | "done" | "notfound">("loading");

  const {
    profile,
    isOwnProfile,
    loading,
  } = useProfile(resolvedUserId ?? "");
  const profileIsPublic = profile?.isPublic !== false;
  const { isFollowing, hasPendingRequest, follow, unfollow, cancelRequest } = useFollowActions(resolvedUserId ?? "", isOwnProfile, profileIsPublic);
  const canViewFull = isOwnProfile || profileIsPublic || isFollowing;
  const { shelf, loading: shelfLoading } = useProfileShelf(resolvedUserId ?? "", isOwnProfile, canViewFull);
  const { activity, favorites } = useProfileActivity(resolvedUserId ?? "", canViewFull);
  const { isBlocked, block, unblock } = useBlockActions(resolvedUserId ?? "", isOwnProfile)

  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);
  const [showFavEditor, setShowFavEditor] = useState(false);
  const [localFavorites, setLocalFavorites] = useState<FavoriteBook[]>(favorites);
  const [prevFavorites, setPrevFavorites] = useState(favorites);
  const [showRequests, setShowRequests] = useState(false);
  const { lists, createList } = useLists(resolvedUserId ?? undefined);
  const [listEditorOpen, setListEditorOpen] = useState(false);

  if (favorites !== prevFavorites) {
    setPrevFavorites(favorites);
    setLocalFavorites(favorites);
  }

  const handleFavSave = (updated: FavoriteBook[]) => setLocalFavorites(updated);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {

      // uid en URL
      if (paramUserId) {
        setResolvedUserId(paramUserId);
        setResolveState("done");
        return;
      }

      // Username
      if (paramUsername) {
        setResolveState("loading");
        const uid = await lookupUidByUsername(paramUsername);
        if (cancelled) return;
        if (uid) {
          setResolvedUserId(uid);
          setResolveState("done");
        } else {
          setResolveState("notfound");
        }
        return;
      }

      // Perfil propio
      if (user?.uid) {
        setResolvedUserId(user.uid);
        setResolveState("done");
        return;
      }

      setResolveState("notfound");
    };

    void resolve();
    return () => { cancelled = true; };
  }, [paramUserId, paramUsername, user]);

  if (resolveState === "loading") {
    return (
      <div className="profile-page profile-page--loading">
        <p>{t("profile.loading")}</p>
      </div>
    );
  }

  if (resolveState === "notfound" || !resolvedUserId) {
    return (
      <div className="profile-page profile-page--not-found">
        <p>{t("profile.notFound")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="profile-page profile-page--loading">
        <p>{t("profile.loading")}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page profile-page--not-found">
        <p>{t("profile.notFound")}</p>
      </div>
    );
  }

  return (
    <section className="profile-page">
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        isFollowing={isFollowing}
        hasPendingRequest={hasPendingRequest}
        booksReadCount={shelf.finished.length}
        onFollow={follow}
        onUnfollow={unfollow}
        onCancelRequest={cancelRequest}
        onFollowersClick={() => setFollowModal("followers")}
        onFollowingClick={() => setFollowModal("following")}
        onEditClick={() => navigate("/profile/edit")}
        onRequestsClick={() => setShowRequests(true)}
        onBlock={block}
        onBooksReadClick={isOwnProfile ? () => navigate("/my-library/shelf", { state: { status: "finished" } }) : undefined}
      />

      {isBlocked ? (
        <BlockedProfileNotice onUnblock={unblock} />
      ) : canViewFull ? (
        <>
          <FavoriteBooksSection
            favorites={localFavorites}
            isOwnProfile={isOwnProfile}
            onEditClick={() => setShowFavEditor(true)}
          />

          <ShelfSection
            books={shelf}
            loading={shelfLoading}
            readOnly={!isOwnProfile}
            onSeeAll={isOwnProfile ? () => navigate("/my-library/shelf") : undefined}
          />

          <div className="profile-page__bottom-row">
            <ActivitySection activity={activity} />
            <ListsSection
              lists={lists}
              userId={resolvedUserId}
              isOwner={isOwnProfile}
              onCreateList={() => setListEditorOpen(true)}
              column
            />
          </div>
        </>
      ) : (
        <LockedProfileNotice profileName={profile.name} />
      )}

      {followModal && (
        <FollowersModal
          userId={resolvedUserId}
          mode={followModal}
          isOwnProfile={isOwnProfile}
          onClose={() => setFollowModal(null)}
        />
      )}

      {showRequests && (
        <FollowRequestsModal onClose={() => setShowRequests(false)} />
      )}

      {showFavEditor && isOwnProfile && (
        <FavoriteBooksEditorModal
          userId={resolvedUserId}
          currentFavorites={localFavorites}
          onClose={() => setShowFavEditor(false)}
          onSave={handleFavSave}
        />
      )}

      {listEditorOpen && isOwnProfile && (
        <ListEditorModal
          onClose={() => setListEditorOpen(false)}
          onSubmit={async ({ name, books }) => { await createList(name, books); }}
        />
      )}
    </section>
  );
}
