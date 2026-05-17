import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./useAuth";
import { useShelf } from "./useShelf";
import { getFavorites, getUserProfile } from "@/services/firebase/firebaseUsers";
import {
  checkIsFollowing,
  followUser,
  unfollowUser,
} from "@/services/firebase/firebaseFollows";
import { getActivity } from "@/services/firebase/firebaseActivity";
import { getShelf } from "@/services/firebase/firebaseLibrary";
import type { UserFullProfile, ActivityItem, FavoriteBook } from "@/types/UserProfile";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";

const EMPTY_SHELF: Record<ShelfStatus, Book[]> = {
  wantToRead: [],
  reading: [],
  finished: [],
  didNotFinish: [],
};
const EMPTY_ACTIVITY: ActivityItem[] = [];
const EMPTY_FAVORITES: FavoriteBook[] = [];

function entriesToShelf(
  entries: { book: Book; status: ShelfStatus }[],
  lang: string,
): Record<ShelfStatus, Book[]> {
  const result: Record<ShelfStatus, Book[]> = {
    wantToRead: [],
    reading: [],
    finished: [],
    didNotFinish: [],
  };
  for (const { book, status } of entries) {
    result[status].push({
      ...book,
      title: book.titles?.[lang] ?? book.titles?.es ?? book.titles?.en ?? book.title ?? "",
      isbn: book.isbns?.[lang] ?? book.isbns?.es ?? book.isbns?.en ?? book.isbn,
    });
  }
  return result;
}

export function useProfile(userId: string) {
  const { user } = useAuth();
  const { shelfByStatus, loading: ownShelfLoading } = useShelf();
  const { i18n } = useTranslation();
  const lang = i18n.language.split('-')[0];

  const isOwnProfile = !!user && user.uid === userId;

  const [profile, setProfile] = useState<UserFullProfile | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>(EMPTY_ACTIVITY);
  const [publicShelf, setPublicShelf] = useState<Record<ShelfStatus, Book[]>>(EMPTY_SHELF);
  const [favorites, setFavorites] = useState<FavoriteBook[]>(EMPTY_FAVORITES);
  const [isFollowingState, setIsFollowingState] = useState(false);
  const [loading, setLoading] = useState(() => !!userId);
  const [bodyLoading, setBodyLoading] = useState(false);

  const [prevUserId, setPrevUserId] = useState(userId);
  if (userId !== prevUserId) {
    setPrevUserId(userId);
    setLoading(!!userId);
    setProfile(null);
    setActivity(EMPTY_ACTIVITY);
    setPublicShelf(EMPTY_SHELF);
    setFavorites(EMPTY_FAVORITES);
    setIsFollowingState(false);
  }

  const canViewFull = isOwnProfile || (profile?.isPublic !== false) || isFollowingState;

  // perfil + estado de follow
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const isOwn = !!user && user.uid === userId;

    const fetches: Promise<void>[] = [
      getUserProfile(userId).then((p) => { if (!cancelled) setProfile(p); }),
    ];

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

  // shelf + activity (solo cuando canViewFull)
  useEffect(() => {
    if (!userId || loading) return;
    if (!canViewFull) return;
    let cancelled = false;
    // setBodyLoading(true);

    // const fetches: Promise<void>[] = [
    //   getActivity(userId, 10).then((a) => { if (!cancelled) setActivity(a); }),
    // ];
    // if (!isOwnProfile) {
    //   fetches.push(
    //     getShelf(userId).then((entries) => {
    //       if (!cancelled) setPublicShelf(entriesToShelf(entries ?? [], lang));
    //     })
    //   );
    // }

    // Promise.all(fetches).finally(() => { if (!cancelled) setBodyLoading(false); });
    // return () => { cancelled = true; };

    const load = async () => {
      setBodyLoading(true);
      try {
        const fetches: Promise<void>[] = [
          getActivity(userId, 10).then((a) => {if (!cancelled) { 
            setActivity(a); 
          }}),
          getFavorites(userId).then((f) => { if (!cancelled) setFavorites(f); }),
        ];

        if (!isOwnProfile) {
          fetches.push(
            getShelf(userId).then((entries) => {
              if (!cancelled) {
                setPublicShelf(entriesToShelf(entries ?? [], lang));
              }
            }));
        }
        await Promise.all(fetches);
      } finally {
        if (!cancelled) {
          setBodyLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [userId, isOwnProfile, canViewFull, loading, lang]);

  const shelf = isOwnProfile ? shelfByStatus : publicShelf;
  const shelfLoading = isOwnProfile ? ownShelfLoading : bodyLoading;

  const follow = useCallback(async () => {
    if (!user) return;
    try {
      await followUser(user.uid, userId);
      setIsFollowingState(true);
      setProfile((p) => (p ? { ...p, followersCount: p.followersCount + 1 } : p));
    } catch {
      console.error("[useProfile] follow failed");
    }
  }, [user, userId]);

  const unfollow = useCallback(async () => {
    if (!user) return;
    try {
      await unfollowUser(user.uid, userId);
      setIsFollowingState(false);
      setProfile((p) => (p ? { ...p, followersCount: p.followersCount - 1 } : p));
      if (profile && profile.isPublic === false) {
        setPublicShelf(EMPTY_SHELF);
        setActivity(EMPTY_ACTIVITY);
      }
    } catch {
      console.error("[useProfile] unfollow failed");
    }
  }, [user, userId, profile]);

  return {
    profile,
    shelf,
    shelfLoading,
    activity,
    favorites,
    isOwnProfile,
    isFollowing: isFollowingState,
    loading,
    canViewFull,
    follow,
    unfollow,
  };
}
