import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase_init";

export type UserProfileData = {
  email?: string;
  name?: string;
  surname?: string;
  birthDate?: string;
}

export async function createUserProfile(
  uid: string,
  data: UserProfileData
): Promise<void> {
  const userRef = doc(db, "Users", uid);
  await setDoc(userRef, {
    ...data,
    createdAt: new Date().toISOString(),
  }, { merge: true });
}