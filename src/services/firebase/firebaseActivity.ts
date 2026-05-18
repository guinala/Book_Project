// src/services/firebase/firebaseActivity.ts
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebaseInit";
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

export async function deleteActivitiesByTypeAndBook(
  uid: string,
  type: string,
  bookId: string
): Promise<void> {
  const q = query(
    collection(db, "Users", uid, "activity"),
    where("type", "==", type),
    where("bookId", "==", bookId)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

export async function deleteProgressActivitiesAbove(
  uid: string,
  bookId: string,
  abovePage: number
): Promise<void> {
  const q = query(
    collection(db, "Users", uid, "activity"),
    where("type", "==", "progress"),
    where("bookId", "==", bookId),
    where("progress", ">", abovePage)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
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
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      type: data.type as ActivityItem["type"],
      createdAt: data.createdAt as Timestamp,
      bookId: data.bookId,
      bookTitle: data.bookTitle,
      bookCoverUrl: data.bookCoverUrl,
      bookAuthor: data.bookAuthor,
      rating: data.rating,
      progress: data.progress,
      listName: data.listName,
      note: data.note,
    };
  });
}
