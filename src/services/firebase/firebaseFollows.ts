// src/services/firebase/firebaseFollows.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebaseInit";
import type { UserMinimal } from "@/types/UserProfile";
import { getUserMinimal } from "./firebaseUsers";

export async function followUser(
  followerId: string,
  followingId: string
): Promise<void> {
  const batch = writeBatch(db);

  batch.set(doc(db, "Users", followerId, "following", followingId), {
    createdAt: new Date(),
  });
  batch.set(doc(db, "Users", followingId, "followers", followerId), {
    createdAt: new Date(),
  });
  batch.update(doc(db, "Users", followerId), { followingCount: increment(1) });
  batch.update(doc(db, "Users", followingId), { followersCount: increment(1) });

  await batch.commit();
}

export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<void> {
  const batch = writeBatch(db);

  batch.delete(doc(db, "Users", followerId, "following", followingId));
  batch.delete(doc(db, "Users", followingId, "followers", followerId));
  batch.update(doc(db, "Users", followerId), { followingCount: increment(-1) });
  batch.update(doc(db, "Users", followingId), { followersCount: increment(-1) });

  await batch.commit();
}

export async function checkIsFollowing(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const snap = await getDoc(
    doc(db, "Users", followerId, "following", followingId)
  );
  return snap.exists();
}

export async function getFollowers(uid: string): Promise<UserMinimal[]> {
  const snap = await getDocs(collection(db, "Users", uid, "followers"));
  const profiles = await Promise.all(snap.docs.map((d) => getUserMinimal(d.id)));
  return profiles.filter((p): p is UserMinimal => p !== null);
}

export async function getFollowing(uid: string): Promise<UserMinimal[]> {
  const snap = await getDocs(collection(db, "Users", uid, "following"));
  const profiles = await Promise.all(snap.docs.map((d) => getUserMinimal(d.id)));
  return profiles.filter((p): p is UserMinimal => p !== null);
}
