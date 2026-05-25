import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { getUserProfile, subscribeToProfileCounts } from "@/services/firebase/firebaseUsers";
import type { UserFullProfile } from "@/types/UserProfile";

export function useProfile(userId: string) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [profile, setProfile] = useState<UserFullProfile | null>(null);
  const [loading, setLoading] = useState(() => !!userId);
  const [prevUserId, setPrevUserId] = useState(userId);

  if (userId !== prevUserId) {
    setPrevUserId(userId);
    setProfile(null);
    setLoading(!!userId);
  }
  
  const isOwnProfile = !!uid && uid === userId;

  useEffect(() => {
    if (!userId) {
      return;
    }
    let cancelled = false;

    getUserProfile(userId)
      .then((p) => { if (!cancelled) setProfile(p); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    return subscribeToProfileCounts(userId, ({ followersCount, followingCount }) =>
      setProfile((p) => (p ? { ...p, followersCount, followingCount } : p)),
    );
  }, [userId]);

  return { profile, loading, isOwnProfile };
}
