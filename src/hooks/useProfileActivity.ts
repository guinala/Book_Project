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

  useEffect(() => {
    if (!userId || !canViewFull) {
      setActivity(EMPTY_ACTIVITY);
      setFavorites(EMPTY_FAVORITES);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getActivity(userId, 10).then((a) => { if (!cancelled) setActivity(a); }),
      getFavorites(userId).then((f) => { if (!cancelled) setFavorites(f); }),
    ]).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, canViewFull]);

  return { activity, favorites, loading };
}
