import { useContext } from "react";
import {
  NotificationsContext,
  type NotificationsContextType,
} from "@/context/notifications/notifications_init";

export function useNotifications(): NotificationsContextType {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }
  return context;
}
