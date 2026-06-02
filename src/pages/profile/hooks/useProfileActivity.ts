import { useEffect, useState } from "react";
import { getActivity } from "@/services/firebase/firebaseActivity";
import { getFavorites } from "@/services/firebase/firebaseUsers";
import type { ActivityItem, FavoriteBook } from "@/types/UserProfile";

const EMPTY_ACTIVITY: ActivityItem[] = [];
const EMPTY_FAVORITES: FavoriteBook[] = [];

export function useProfileActivity(userId: string, canViewFull: boolean) {
  const [activity, setActivity] = useState<ActivityItem[]>(EMPTY_ACTIVITY);
  const [favorites, setFavorites] = useState<FavoriteBook[]>(EMPTY_FAVORITES);
  const [loading, setLoading] = useState(false);
  const [prevKey, setPrevKey] = useState({ userId, canViewFull });

  if (prevKey.userId !== userId || prevKey.canViewFull !== canViewFull) {
    setPrevKey({ userId, canViewFull });
    setActivity(EMPTY_ACTIVITY);
    setFavorites(EMPTY_FAVORITES);
    setLoading(!!userId && canViewFull);
  }

  useEffect(() => {
    if (!userId || !canViewFull) return;
    let cancelled = false;
    Promise.all([
      getActivity(userId, 10).then((a) => { if (!cancelled) setActivity(a); }),
      getFavorites(userId).then((f) => { if (!cancelled) setFavorites(f); }),
    ]).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, canViewFull]);

  return { activity, favorites, loading };
}
