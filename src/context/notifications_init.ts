import type { Notification } from "@/types/UserProfile"
import { createContext } from "react";

export type NotificationsContextType = {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    markAllRead: () => Promise<void>;
    remove: (id: string) => Promise<void>;
    acceptRequest: (actorUid: string) => Promise<void>;
    rejectRequest: (actorUid: string) => Promise<void>;
}

export const NotificationsContext = createContext<NotificationsContextType | null>(null);