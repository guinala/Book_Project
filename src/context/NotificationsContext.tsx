import { acceptFollowRequest, rejectFollowRequest } from "@/services/firebase/firebaseFollows";
import { deleteNotification, markAllAsRead, subscribeToNotifications } from "@/services/firebase/firebaseNotifications";
import type { Notification } from "@/types/UserProfile";
import { useEffect, useMemo, useState } from "react";
import { NotificationsContext } from "./notifications_init";
import { useAuth } from "@/hooks/useAuth";

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const uid = user?.uid ?? null;
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loadedUid, setLoadedUid] = useState<string | null>(null);

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

    const markAllRead = async () => {
        if (!uid || unreadCount === 0) {
            return;
        }

        const rollback = notifications;
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

        try {
            await markAllAsRead(uid);
        } catch (err) {
            console.error("[notifications] markAllRead failed", err);
            setNotifications(rollback);
        }
    }

    const remove = async (id: string) => {
        if (!uid) {
            return;
        }

        const rollback = notifications;
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        
        try {
            await deleteNotification(uid, id);
        } catch (err) {
            console.error("[notifications] remove failed", err);
            setNotifications(rollback);
        }
    };

    const acceptRequest = async (actorUid: string) => {
        if (!uid) {
            return;
        }
        
        const rollback = notifications;
        setNotifications((prev) => prev.filter((n) => !(n.type === "follow_request" && n.actorUid === actorUid)));
        try {
            await acceptFollowRequest(actorUid);
        } catch (err) {
            console.error("[notifications] acceptRequest failed", err);
            setNotifications(rollback);
        }
  };

  const rejectRequest = async (actorUid: string) => {
    if (!uid) return;
    const rollback = notifications;
    setNotifications((prev) =>
      prev.filter(
        (n) => !(n.type === "follow_request" && n.actorUid === actorUid)
      )
    );
    try {
      await rejectFollowRequest(actorUid);
    } catch (err) {
      console.error("[notifications] rejectRequest failed", err);
      setNotifications(rollback);
    }
  };

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