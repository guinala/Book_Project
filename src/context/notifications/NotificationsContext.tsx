import { acceptFollowRequest, rejectFollowRequest } from "@/services/firebase/firebaseFollows";
import { deleteNotification, markAllAsRead, subscribeToNotifications } from "@/services/firebase/firebaseNotifications";
import type { Notification } from "@/types/UserProfile";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NotificationsContext } from "./notifications_init";
import { useAuth } from "@/context/auth/useAuth";
import { logger } from "@/utils/logger";

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const uid = user?.uid ?? null;
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loadedUid, setLoadedUid] = useState<string | null>(null);
    const notificationsRef = useRef<Notification[]>([]);

    useEffect(() => {
        notificationsRef.current = notifications;
    }, [notifications]);

    useEffect(() => {
        if (!uid) {
            return;
        }
        const unsub = subscribeToNotifications(uid, (items) => {
        notificationsRef.current = items;
        setNotifications(items);
        setLoadedUid(uid);
        });
        return () => unsub();
    }, [uid]);

    const list = useMemo(
        () => (loadedUid === uid ? notifications : []),
        [loadedUid, uid, notifications]
    );

    const loading = uid !== null && loadedUid !== uid;

    const unreadCount = useMemo(
        () => list.filter((n) => !n.read).length,
        [list]
    );

    const markAllRead = useCallback(async () => {
        if (!uid || notificationsRef.current.every((n) => n.read)) {
            return;
        }

        const rollback = notificationsRef.current;
        const next = rollback.map((n) => ({ ...n, read: true }));
        notificationsRef.current = next;
        setNotifications(next);

        try {
            await markAllAsRead(uid);
        } catch (err) {
            logger.error("[notifications] markAllRead failed", err);
            notificationsRef.current = rollback;
            setNotifications(rollback);
        }
    }, [uid]);

    const remove = useCallback(async (id: string) => {
        if (!uid) {
            return;
        }

        const rollback = notificationsRef.current;
        const next = rollback.filter((n) => n.id !== id);
        notificationsRef.current = next;
        setNotifications(next);
        
        try {
            await deleteNotification(uid, id);
        } catch (err) {
            logger.error("[notifications] remove failed", err);
            notificationsRef.current = rollback;
            setNotifications(rollback);
        }
    }, [uid]);

    const acceptRequest = useCallback(async (actorUid: string) => {
        if (!uid) {
            return;
        }
        
        const rollback = notificationsRef.current;
        const next = rollback.filter((n) => !(n.type === "follow_request" && n.actorUid === actorUid));
        notificationsRef.current = next;
        setNotifications(next);
        try {
            await acceptFollowRequest(actorUid);
        } catch (err) {
            logger.error("[notifications] acceptRequest failed", err);
            notificationsRef.current = rollback;
            setNotifications(rollback);
        }
  }, [uid]);

  const rejectRequest = useCallback(async (actorUid: string) => {
    if (!uid) return;
    const rollback = notificationsRef.current;
    const next = rollback.filter(
      (n) => !(n.type === "follow_request" && n.actorUid === actorUid)
    );
    notificationsRef.current = next;
    setNotifications(next);
    try {
      await rejectFollowRequest(actorUid);
    } catch (err) {
      logger.error("[notifications] rejectRequest failed", err);
      notificationsRef.current = rollback;
      setNotifications(rollback);
    }
  }, [uid]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAllRead,
        remove,
        acceptRequest,
        rejectRequest,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
