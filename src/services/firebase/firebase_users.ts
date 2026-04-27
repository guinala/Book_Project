import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase_init";
import type { UserFullProfile, UserMinimal } from "@/types/UserProfile";

export type UserProfileData = {
  email?: string;
  name?: string;
  surname?: string;
  birthDate?: string;
};

export async function createUserProfile(
  uid: string,
  data: UserProfileData
): Promise<void> {
  const userRef = doc(db, "Users", uid);
  await setDoc(userRef, {
    ...data,
    followersCount: 0,
    followingCount: 0,
    favoriteBooks: [],
    createdAt: new Date().toISOString(),
  }, { merge: true });
}

export async function getUserProfile(uid: string): Promise<UserFullProfile | null> {
  const snap = await getDoc(doc(db, "Users", uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    uid,
    email: d.email ?? "",
    name: d.name ?? "",
    surname: d.surname ?? "",
    username: d.username ?? "",
    bio: d.bio ?? "",
    profilePhotoUrl: d.profilePhotoUrl ?? "",
    bannerImageUrl: d.bannerImageUrl ?? "",
    favoriteBooks: d.favoriteBooks ?? [],
    followersCount: d.followersCount ?? 0,
    followingCount: d.followingCount ?? 0,
    birthDate: d.birthDate,
  };
}

export async function getUserMinimal(uid: string): Promise<UserMinimal | null> {
  const snap = await getDoc(doc(db, "Users", uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    uid,
    name: d.name ?? "",
    username: d.username ?? "",
    profilePhotoUrl: d.profilePhotoUrl ?? "",
  };
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Omit<UserFullProfile, "uid">>
): Promise<void> {
  await setDoc(doc(db, "Users", uid), data, { merge: true });
}
