import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "./firebaseInit";
import type { UserFullProfile, UserMinimal } from "@/types/UserProfile";

export type UserProfileData = {
  email?: string;
  name?: string;
  surname?: string;
  birthDate?: string;
};

export async function updatePrivateInfo(
  uid: string,
  data: { email?: string; birthDate?: string }
): Promise<void> {
  await setDoc(doc(db, "Users", uid, "private", "info"), data, { merge: true });
}

// export async function createUserProfile(
//   uid: string,
//   data: UserProfileData
// ): Promise<void> {
//   const userRef = doc(db, "Users", uid);
//   await setDoc(userRef, {
//     ...data,
//     followersCount: 0,
//     followingCount: 0,
//     favoriteBooks: [],
//     createdAt: new Date().toISOString(),
//   }, { merge: true });
// }
export async function createUserProfile(
  uid: string, 
  data: UserProfileData
): Promise<void> {
  const { email, birthDate, ...publicData } = data;
  await setDoc(doc(db, "Users", uid), {
    ...publicData,
    isPublic: true,
    followersCount: 0,
    followingCount: 0,
    favoriteBooks: [],
    createdAt: new Date().toISOString(),
  }, { merge: true });
  if (email !== undefined || birthDate !== undefined) {
    await updatePrivateInfo(uid, { email, birthDate });
  }
}


// export async function getUserProfile(uid: string): Promise<UserFullProfile | null> {
//   const snap = await getDoc(doc(db, "Users", uid));
//   if (!snap.exists()) return null;
//   const d = snap.data();
//   return {
//     uid,
//     email: d.email ?? "",
//     name: d.name ?? "",
//     surname: d.surname ?? "",
//     username: d.username ?? "",
//     bio: d.bio ?? "",
//     profilePhotoUrl: d.profilePhotoUrl ?? "",
//     bannerImageUrl: d.bannerImageUrl ?? "",
//     favoriteBooks: d.favoriteBooks ?? [],
//     followersCount: d.followersCount ?? 0,
//     followingCount: d.followingCount ?? 0,
//     birthDate: d.birthDate,
//   };
// }

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
    favoriteBooks: d.favoriteBooks ?? [],
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
  data: Partial<Omit<UserFullProfile, "uid" | "email" | "birthDate">>
): Promise<void> {
  await updateDoc(doc(db, "Users", uid), data);
}
