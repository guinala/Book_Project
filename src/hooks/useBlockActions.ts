import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/auth/useAuth";
import { blockUser, checkIsBlocked, unblockUser } from "@/services/firebase/firebaseBlocks";
import { logger } from "@/utils/logger";

export function useBlockActions(userId: string, isOwnProfile: boolean) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [isBlocked, setIsBlocked] = useState(false);
  const [prevKey, setPrevKey] = useState({ uid, userId, isOwnProfile });

  if (prevKey.uid !== uid || prevKey.userId !== userId || prevKey.isOwnProfile !== isOwnProfile) {
    setPrevKey({ uid, userId, isOwnProfile });
    setIsBlocked(false);
  }

  useEffect(() => {
    if (!uid || !userId || isOwnProfile) {
      return;
    }

    let cancelled = false;

    checkIsBlocked(userId).then((b) => { if (!cancelled) setIsBlocked(b); });
    return () => { cancelled = true; };
  }, [uid, userId, isOwnProfile]);

  const block = useCallback(async () => {
    if (!uid) {
      return;
    }

    setIsBlocked(true);
    try { 
      await blockUser(userId); 
    }
    catch (err) {
      logger.error("[useBlockActions] block failed", err);
      setIsBlocked(false);
    }
  }, [uid, userId]);

  const unblock = useCallback(async () => {
    if (!uid) return;
    setIsBlocked(false);
    try { await unblockUser(userId); }
    catch (err) {
      logger.error("[useBlockActions] unblock failed", err);
      setIsBlocked(true);
    }
  }, [uid, userId]);

  return { isBlocked, block, unblock };
}
