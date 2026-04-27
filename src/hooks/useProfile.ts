// src/hooks/useProfile.ts
import { useCallback, useEffect, useState } from "react";
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
  const result: Record<ShelfStatus, Book[]> = {
    wantToRead: [],
    reading: [],
    finished: [],
    didNotFinish: [],
  };
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
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const isOwn = !!user && user.uid === userId;

    setLoading(true);
    setPublicShelf({ wantToRead: [], reading: [], finished: [], didNotFinish: [] });

    const fetches: Promise<void>[] = [
      getUserProfile(userId).then((p) => { if (!cancelled) setProfile(p); }),
      getActivity(userId, 10).then((a) => { if (!cancelled) setActivity(a); }),
    ];

    if (!isOwn) {
      fetches.push(
        getShelf(userId).then((entries) => {
          if (!cancelled) setPublicShelf(entriesToShelf(entries ?? []));
        })
      );
    }

    if (user && !isOwn) {
      fetches.push(
        checkIsFollowing(user.uid, userId).then((f) => {
          if (!cancelled) setIsFollowingState(f);
        })
      );
    }

    Promise.all(fetches).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, user]);

  const shelf = isOwnProfile ? shelfByStatus : publicShelf;
  const shelfLoading = isOwnProfile ? ownShelfLoading : loading;

  const follow = useCallback(async () => {
    if (!user) return;
    await followUser(user.uid, userId);
    setIsFollowingState(true);
    setProfile((p) => (p ? { ...p, followersCount: p.followersCount + 1 } : p));
  }, [user, userId]);

  const unfollow = useCallback(async () => {
    if (!user) return;
    await unfollowUser(user.uid, userId);
    setIsFollowingState(false);
    setProfile((p) => (p ? { ...p, followersCount: p.followersCount - 1 } : p));
  }, [user, userId]);

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
