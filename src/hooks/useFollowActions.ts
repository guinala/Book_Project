import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import {
  cancelFollowRequest,
  checkHasPendingRequest,
  checkIsFollowing,
  followUser,
  sendFollowRequest,
  unfollowUser,
} from "@/services/firebase/firebaseFollows";
import { logger } from "@/utils/logger";

export function useFollowActions(userId: string, isOwnProfile: boolean, profileIsPublic: boolean) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  useEffect(() => {
    if (!uid || !userId || isOwnProfile) {
      setIsFollowing(false);
      setHasPendingRequest(false);
      return;
    }
    let cancelled = false;
    Promise.all([
      checkIsFollowing(uid, userId),
      checkHasPendingRequest(userId),
    ]).then(([f, p]) => {
      if (cancelled) return;
      setIsFollowing(f);
      setHasPendingRequest(p);
    });
    return () => { cancelled = true; };
  }, [uid, userId, isOwnProfile]);

  const follow = useCallback(async () => {
    if (!uid) return;
    const isPrivate = !profileIsPublic;
    if (isPrivate) setHasPendingRequest(true);
    else setIsFollowing(true);
    try {
      if (isPrivate) await sendFollowRequest(userId);
      else await followUser(userId);
    } catch (err) {
      logger.error("[useFollowActions] follow failed", err);
      if (isPrivate) setHasPendingRequest(false);
      else setIsFollowing(false);
    }
  }, [uid, userId, profileIsPublic]);

  const unfollow = useCallback(async () => {
    if (!uid) return;
    setIsFollowing(false);
    try {
      await unfollowUser(userId);
    } catch (err) {
      logger.error("[useFollowActions] unfollow failed", err);
      setIsFollowing(true);
    }
  }, [uid, userId]);

  const cancelRequest = useCallback(async () => {
    if (!uid) return;
    setHasPendingRequest(false);
    try {
      await cancelFollowRequest(userId);
    } catch (err) {
      logger.error("[useFollowActions] cancelRequest failed", err);
      setHasPendingRequest(true);
    }
  }, [uid, userId]);

  return { isFollowing, hasPendingRequest, follow, unfollow, cancelRequest };
}
