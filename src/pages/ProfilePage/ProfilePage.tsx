// src/pages/ProfilePage/ProfilePage.tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import ProfileHeader from "@/components/ProfileHeader/ProfileHeader";
import FavoriteBooksSection from "@/components/FavoriteBooksSection/FavoriteBooksSection";
import FavoriteBooksEditorModal from "@/components/FavoriteBooksEditorModal/FavoriteBooksEditorModal";
import ShelfSection from "@/components/ShelfSection/ShelfSection";
import ActivitySection from "@/components/ActivitySection/ActivitySection";
import ListsSection from "@/components/ListsSection/ListsSection";
import FollowersModal from "@/components/FollowersModal/FollowersModal";
import type { ReadingList } from "@/components/ListCard/ListCard";
import type { FavoriteBook } from "@/types/UserProfile";
import listCover1 from "@/assets/covers/shelf-1.jpg";
import listCover2 from "@/assets/covers/shelf-2.jpg";
import listCover3 from "@/assets/covers/shelf-3.jpg";
import listCover4 from "@/assets/covers/shelf-4.jpg";
import listCover5 from "@/assets/covers/shelf-5.jpeg";
import "./ProfilePage.scss";

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
    follow,
    unfollow,
  } = useProfile(resolvedUserId);

  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);
  const [showFavEditor, setShowFavEditor] = useState(false);

  const handleFavSave = (_updated: FavoriteBook[]) => {};

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

      <FavoriteBooksSection
        favorites={profile.favoriteBooks}
        isOwnProfile={isOwnProfile}
        onEditClick={() => setShowFavEditor(true)}
      />

      <ShelfSection
        books={shelf}
        loading={shelfLoading}
        readOnly={!isOwnProfile}
      />

      <div className="profile-page__bottom-row">
        <ActivitySection activity={activity} />
        <ListsSection lists={READING_LISTS} />
      </div>

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
          currentFavorites={profile.favoriteBooks}
          onClose={() => setShowFavEditor(false)}
          onSave={handleFavSave}
        />
      )}
    </section>
  );
}
