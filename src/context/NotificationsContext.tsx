import { acceptFollowRequest, rejectFollowRequest } from "@/services/firebase/firebaseFollows";
import { deleteNotification, markAllAsRead, subscribeToNotifications } from "@/services/firebase/firebaseNotifications";
import type { Notification } from "@/types/UserProfile";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NotificationsContext } from "./notifications_init";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/utils/logger";

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const uid = user?.uid ?? null;
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loadedUid, setLoadedUid] = useState<string | null>(null);
    const notificationsRef = useRef<Notification[]>([]);
    const unreadCountRef = useRef(0);

    useEffect(() => {
        notificationsRef.current = notifications;
    }, [notifications]);

    useEffect(() => {
        if (!uid) {
            return;
        }
        const unsub = subscribeToNotifications(uid, (items) => {
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

    useEffect(() => {
        unreadCountRef.current = unreadCount;
    }, [unreadCount]);

    const markAllRead = useCallback(async () => {
        if (!uid || unreadCountRef.current === 0) {
            return;
        }

        const rollback = notificationsRef.current;
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

        try {
            await markAllAsRead(uid);
        } catch (err) {
            logger.error("[notifications] markAllRead failed", err);
            setNotifications(rollback);
        }
    }, [uid]);

    const remove = useCallback(async (id: string) => {
        if (!uid) {
            return;
        }

        const rollback = notificationsRef.current;
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        
        try {
            await deleteNotification(uid, id);
        } catch (err) {
            logger.error("[notifications] remove failed", err);
            setNotifications(rollback);
        }
    }, [uid]);

    const acceptRequest = useCallback(async (actorUid: string) => {
        if (!uid) {
            return;
        }
        
        const rollback = notificationsRef.current;
        setNotifications((prev) => prev.filter((n) => !(n.type === "follow_request" && n.actorUid === actorUid)));
        try {
            await acceptFollowRequest(actorUid);
        } catch (err) {
            logger.error("[notifications] acceptRequest failed", err);
            setNotifications(rollback);
        }
  }, [uid]);

  const rejectRequest = useCallback(async (actorUid: string) => {
    if (!uid) return;
    const rollback = notificationsRef.current;
    setNotifications((prev) =>
      prev.filter(
        (n) => !(n.type === "follow_request" && n.actorUid === actorUid)
      )
    );
    try {
      await rejectFollowRequest(actorUid);
    } catch (err) {
      logger.error("[notifications] rejectRequest failed", err);
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
