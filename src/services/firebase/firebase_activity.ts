// src/services/firebase/firebase_activity.ts
import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "./firebase_init";
import type { ActivityEvent, ActivityItem } from "@/types/UserProfile";

export async function logActivity(
  uid: string,
  event: ActivityEvent
): Promise<void> {
  await addDoc(collection(db, "Users", uid, "activity"), {
    ...event,
    createdAt: Timestamp.now(),
  });
}

export async function getActivity(
  uid: string,
  maxResults = 10
): Promise<ActivityItem[]> {
  const q = query(
    collection(db, "Users", uid, "activity"),
    orderBy("createdAt", "desc"),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ActivityItem, "id">),
  }));
}
