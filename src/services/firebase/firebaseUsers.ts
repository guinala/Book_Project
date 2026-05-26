import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "./firebaseInit";
import type { FavoriteBook, UserFullProfile, UserMinimal } from "@/types/UserProfile";

export type UserProfileData = {
  email?: string;
  name?: string;
  surname?: string;
  birthDate?: string;
  acceptedTermsAt?: string;
  acceptedTermsVersion?: string;
};

export async function updatePrivateInfo(
  uid: string,
  data: { email?: string; birthDate?: string }
): Promise<void> {
  await setDoc(doc(db, "Users", uid, "private", "info"), data, { merge: true });
}

export async function createUserProfile(
  uid: string, 
  data: UserProfileData
): Promise<void> {
  const { email, birthDate, acceptedTermsAt, acceptedTermsVersion, ...publicData } = data;
  const userRef = doc(db, "Users", uid);

  const existing = await getDoc(userRef);
  if (!existing.exists()) {
    const publicDoc: Record<string, unknown> = {
      ...publicData,
      isPublic: true,
      followersCount: 0,
      followingCount: 0,
      createdAt: new Date().toISOString(),
    };
    if (acceptedTermsAt !== undefined) {
      publicDoc.acceptedTermsAt = acceptedTermsAt;
    }

    if (acceptedTermsVersion !== undefined) {
      publicDoc.acceptedTermsVersion = acceptedTermsVersion;
    }

    await setDoc(userRef, publicDoc);
  }

  if (email !== undefined || birthDate !== undefined) {
    await updatePrivateInfo(uid, { email, birthDate });
  }
}

export async function getUserProfile(uid: string): Promise<UserFullProfile | null> {
  const snap = await getDoc(doc(db, "Users", uid));
  if (!snap.exists()) return null;
  const d = snap.data();

  let email = "";
  let birthDate: string | undefined;
  if (auth.currentUser?.uid === uid) {
    const privSnap = await getDoc(doc(db, "Users", uid, "private", "info"));
    if (privSnap.exists()) {
      const p = privSnap.data();
      email = p.email ?? "";
      birthDate = p.birthDate;
    }
  }

  return {
    uid,
    email,
    birthDate,
    name: d.name ?? "",
    surname: d.surname ?? "",
    username: d.username ?? "",
    bio: d.bio ?? "",
    profilePhotoUrl: d.profilePhotoUrl ?? "",
    bannerImageUrl: d.bannerImageUrl ?? "",
    followersCount: d.followersCount ?? 0,
    followingCount: d.followingCount ?? 0,
    isPublic: d.isPublic ?? true,
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
  data: Partial<Omit<UserFullProfile, "uid" | "email" | "birthDate" | "username" | "followersCount" | "followingCount">>
): Promise<void> {
  await updateDoc(doc(db, "Users", uid), data);
}

export async function getFavorites(uid: string): Promise<FavoriteBook[]> {
  const snap = await getDoc(doc(db, "Users", uid, "favorites", "list"));
  if (!snap.exists()) return [];
  return (snap.data().books as FavoriteBook[]) ?? [];
}

export async function saveFavorites(
  uid: string,
  books: FavoriteBook[]
): Promise<void> {
  await setDoc(doc(db, "Users", uid, "favorites", "list"), { books });
}

export function subscribeToProfileCounts(
  uid: string,
  onUpdate: (counts: { followersCount: number; followingCount: number }) => void
): () => void {
  return onSnapshot(doc(db, "Users", uid), (snap) => {
    if (!snap.exists()) return;
    const d = snap.data();
    onUpdate({
      followersCount: d.followersCount ?? 0,
      followingCount: d.followingCount ?? 0,
    });
  });
}

export async function userProfileExists(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "Users", uid));
  return snap.exists();
}


