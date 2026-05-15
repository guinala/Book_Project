// src/pages/ProfilePage/ProfilePage.tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import ProfileHeader from "@/components/profile/sections/ProfileHeader";
import FavoriteBooksSection from "@/components/profile/sections/FavoriteBooksSection";
import FavoriteBooksEditorModal from "@/components/profile/modals/FavoriteBooksEditorModal";
import ShelfSection from "@/components/shelf/sections/ShelfSection";
import ActivitySection from "@/components/profile/sections/ActivitySection";
import ListsSection from "@/components/shelf/sections/ListsSection";
import FollowersModal from "@/components/profile/modals/FollowersModal";
import type { ReadingList } from "@/components/shelf/cards/ListCard";
import type { FavoriteBook } from "@/types/UserProfile";
import listCover1 from "@/assets/covers/shelf-1.jpg";
import listCover2 from "@/assets/covers/shelf-2.jpg";
import listCover3 from "@/assets/covers/shelf-3.jpg";
import listCover4 from "@/assets/covers/shelf-4.jpg";
import listCover5 from "@/assets/covers/shelf-5.jpg";
import "./ProfilePage.scss";
import LockedProfileNotice from "@/components/profile/sections/LockedProfileNotice";

const READING_LISTS: ReadingList[] = [
  { id: "recommended", nameKey: "myLibrary.lists.recommended", count: 12, coverUrls: [listCover1, listCover3, listCover2, listCover5] },
  { id: "drama", nameKey: "myLibrary.lists.drama", count: 20, coverUrls: [listCover4, listCover5, listCover1, listCover3] },
  { id: "women", nameKey: "myLibrary.lists.women", count: 9, coverUrls: [listCover3, listCover1, listCover4, listCover5] },
];

export default function ProfilePage() {
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const resolvedUserId = paramUserId ?? user?.uid ?? "";

  const {
    profile,
    shelf,
    shelfLoading,
    activity,
    isOwnProfile,
    isFollowing,
    loading,
    canViewFull,
    follow,
    unfollow,
  } = useProfile(resolvedUserId);

  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);
  const [showFavEditor, setShowFavEditor] = useState(false);
  const [localFavorites, setLocalFavorites] = useState<FavoriteBook[]>(
    profile?.favoriteBooks ?? []
  );
  const [prevProfile, setPrevProfile] = useState(profile);
  if (profile !== prevProfile) {
    setPrevProfile(profile);
    setLocalFavorites(profile?.favoriteBooks ?? []);
  }

  const handleFavSave = (updated: FavoriteBook[]) => setLocalFavorites(updated);

  if (loading) {
    return (
      <div className="profile-page profile-page--loading">
        <p>Cargando perfil...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page profile-page--not-found">
        <p>Perfil no encontrado</p>
      </div>
    );
  }

  return (
    <section className="profile-page">
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        isFollowing={isFollowing}
        booksReadCount={shelf.finished.length}
        onFollow={follow}
        onUnfollow={unfollow}
        onFollowersClick={() => setFollowModal("followers")}
        onFollowingClick={() => setFollowModal("following")}
        onEditClick={() => navigate("/profile/edit")}
      />
      {/* <FavoriteBooksSection
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
        <ListsSection lists={READING_LISTS} />
      </div> */}
      {canViewFull ? (
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
            <ListsSection lists={READING_LISTS} />
          </div>
        </>
      ) : (
        <LockedProfileNotice profileName={profile.name} />
      )}


      {followModal && (
        <FollowersModal
          userId={resolvedUserId}
          mode={followModal}
          onClose={() => setFollowModal(null)}
        />
      )}

      {showFavEditor && isOwnProfile && (
        <FavoriteBooksEditorModal
          userId={resolvedUserId}
          currentFavorites={localFavorites}
          onClose={() => setShowFavEditor(false)}
          onSave={handleFavSave}
        />
      )}
    </section>
  );
}
