// src/hooks/useProfile.ts
import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { useShelf } from "./useShelf";
import { getUserProfile } from "@/services/firebase/firebase_users";
import {
  checkIsFollowing,
  followUser,
  unfollowUser,
} from "@/services/firebase/firebase_follows";
import { getActivity } from "@/services/firebase/firebase_activity";
import { getShelf } from "@/services/firebase/firebase_library";
import type { UserFullProfile, ActivityItem } from "@/types/UserProfile";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";

const EMPTY_SHELF: Record<ShelfStatus, Book[]> = {
  wantToRead: [],
  reading: [],
  finished: [],
  didNotFinish: [],
};

function entriesToShelf(
  entries: { book: Book; status: ShelfStatus }[]
): Record<ShelfStatus, Book[]> {
  const result: Record<ShelfStatus, Book[]> = { ...EMPTY_SHELF };
  for (const { book, status } of entries) {
    result[status].push(book);
  }
  return result;
}

export function useProfile(userId: string) {
  const { user } = useAuth();
  const { shelfByStatus, loading: ownShelfLoading } = useShelf();

  const isOwnProfile = !!user && user.uid === userId;

  const [profile, setProfile] = useState<UserFullProfile | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [publicShelf, setPublicShelf] = useState<Record<ShelfStatus, Book[]>>(EMPTY_SHELF);
  const [isFollowingState, setIsFollowingState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    const fetches: Promise<void>[] = [
      getUserProfile(userId).then((p) => setProfile(p)),
      getActivity(userId, 10).then((a) => setActivity(a)),
    ];

    if (!isOwnProfile) {
      fetches.push(
        getShelf(userId).then((entries) =>
          setPublicShelf(entriesToShelf(entries ?? []))
        )
      );
    }

    if (user && !isOwnProfile) {
      fetches.push(
        checkIsFollowing(user.uid, userId).then((f) =>
          setIsFollowingState(f)
        )
      );
    }

    Promise.all(fetches).finally(() => setLoading(false));
  }, [userId, isOwnProfile, user]);

  const shelf = isOwnProfile ? shelfByStatus : publicShelf;
  const shelfLoading = isOwnProfile ? ownShelfLoading : loading;

  const follow = async () => {
    if (!user) return;
    await followUser(user.uid, userId);
    setIsFollowingState(true);
    setProfile((p) => (p ? { ...p, followersCount: p.followersCount + 1 } : p));
  };

  const unfollow = async () => {
    if (!user) return;
    await unfollowUser(user.uid, userId);
    setIsFollowingState(false);
    setProfile((p) => (p ? { ...p, followersCount: p.followersCount - 1 } : p));
  };

  return {
    profile,
    shelf,
    shelfLoading,
    activity,
    isOwnProfile,
    isFollowing: isFollowingState,
    loading,
    follow,
    unfollow,
  };
}
