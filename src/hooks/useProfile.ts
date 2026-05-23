import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./useAuth";
import { useShelf } from "./useShelf";
import { getFavorites, getUserProfile, subscribeToProfileCounts } from "@/services/firebase/firebaseUsers";
import {
  cancelFollowRequest,
  checkHasPendingRequest,
  checkIsFollowing,
  followUser,
  sendFollowRequest,
  unfollowUser,
} from "@/services/firebase/firebaseFollows";
import { blockUser, checkIsBlocked, unblockUser } from "@/services/firebase/firebaseBlocks";
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
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isFollowingState, setIsFollowingState] = useState(false);
  const [isBlockedState, setIsBlockedState] = useState(false);
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
    setHasPendingRequest(false);
    setIsBlockedState(false);
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

    // if (user && !isOwn) {
    //   fetches.push(
    //     checkIsFollowing(user.uid, userId).then((f) => {
    //       if (!cancelled) setIsFollowingState(f);
    //     })
    //   );
    // }
    if (user && !isOwn) {
      fetches.push(
        checkIsFollowing(user.uid, userId).then((f) => {
          if (!cancelled) setIsFollowingState(f);
        }),
        checkHasPendingRequest(userId).then((p) => {
          if (!cancelled) setHasPendingRequest(p);
        }),
        checkIsBlocked(userId).then((b) => {
          if (!cancelled) setIsBlockedState(b);
        })
      );
    }

    Promise.all(fetches).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, user]);

  // Escucha cambios en tiempo real de followersCount / followingCount
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToProfileCounts(userId, ({ followersCount, followingCount }) => {
      setProfile((p) => p ? { ...p, followersCount, followingCount } : p);
    });
    return unsubscribe;
  }, [userId]);

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

  // const follow = useCallback(async () => {
  //   if (!user) return;
  //   try {
  //     await followUser(user.uid, userId);
  //     setIsFollowingState(true);
  //     setProfile((p) => (p ? { ...p, followersCount: p.followersCount + 1 } : p));
  //   } catch {
  //     console.error("[useProfile] follow failed");
  //   }
  // }, [user, userId]);
  const follow = useCallback(async () => {
    if (!user || !profile) {
      return;
    }
    const isPrivate = profile.isPublic === false;

    //Se actualiza ya la UI (a falta de que se actulice Firebase)
    if (isPrivate) {
      setHasPendingRequest(true);
    } else {
      setIsFollowingState(true);
      setProfile((p) => (p ? { ...p, followersCount: p.followersCount + 1 } : p));
    }

    try {
      if (isPrivate) {
        //Privado -> se manda solicitud
        await sendFollowRequest(userId);
        ///setHasPendingRequest(true);
      } else {
        await followUser(userId);
        // setIsFollowingState(true);
        // setProfile((p) => 
        //   p ? {...p, followersCount: p.followersCount + 1 } : p
        // );
      }
    } catch {
      console.error("[useProfile] follow failed");
      if (isPrivate) {
        setHasPendingRequest(false);
      } else {
        setIsFollowingState(false);
        setProfile((p) =>
          p ? { ...p, followersCount: p.followersCount - 1 } : p
        );
      }
    }
  }, [user, userId, profile]);

  const unfollow = useCallback(async () => {
    if (!user) return;

    // Actualizar ya
    setIsFollowingState(false);
    setProfile((p) => (p ? { ...p, followersCount: p.followersCount - 1 } : p));

    try {
      await unfollowUser(userId);
      // setIsFollowingState(false);
      // setProfile((p) => (p ? { ...p, followersCount: p.followersCount - 1 } : p));
      // if (profile && profile.isPublic === false) {
      //   setPublicShelf(EMPTY_SHELF);
      //   setActivity(EMPTY_ACTIVITY);
      // }
    } catch {
      console.error("[useProfile] unfollow failed");
      setIsFollowingState(true);
      setProfile((p) => (p ? { ...p, followersCount: p.followersCount + 1 } : p));
    }
  }, [user, userId]);

  const cancelRequest = useCallback(async () => {
    if (!user) return;
    setHasPendingRequest(false);

    try {
      await cancelFollowRequest(userId);
      //setHasPendingRequest(false);
    } catch {
      console.error("[useProfile] cancelRequest failed");
      setHasPendingRequest(true);
    }
  }, [user, userId]);

  const block = useCallback(async () => {
    if (!user) return;
    setIsBlockedState(true);
    try {
      await blockUser(userId);
      //setIsBlockedState(true);
    } catch {
      console.error("[useProfile] block failed");
      setIsBlockedState(false);
    }
  }, [user, userId]);

  const unblock = useCallback(async () => {
    if (!user) return;
    setIsBlockedState(false);
    try {
      await unblockUser(userId);
      //setIsBlockedState(false);
    } catch {
      console.error("[useProfile] unblock failed");
      setIsBlockedState(true);
    }
  }, [user, userId]);

  const incrementFollowers = useCallback(() => {
    setProfile((p) => (p ? { ...p, followersCount: p.followersCount + 1 } : p));
  }, []);

  const decrementFollowers = useCallback(() => {
    setProfile((p) => (p ? { ...p, followersCount: Math.max(0, p.followersCount - 1) } : p));
  }, []);

  return {
    profile,
    shelf,
    shelfLoading,
    activity,
    favorites,
    isOwnProfile,
    isFollowing: isFollowingState,
    hasPendingRequest,
    isBlocked: isBlockedState,
    loading,
    canViewFull,
    follow,
    unfollow,
    cancelRequest,
    block,
    unblock,
    incrementFollowers,
    decrementFollowers,
  };
}
