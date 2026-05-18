import { deleteDoc, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebaseInit";

export async function blockUser(targetUid: string): Promise<void> {
  const me = auth.currentUser?.uid;
  if (!me) throw new Error("Sesión requerida");
  await setDoc(doc(db, "Users", me, "blocked", targetUid), {
    blockedAt: serverTimestamp(),
  });
}

export async function unblockUser(targetUid: string): Promise<void> {
  const me = auth.currentUser?.uid;
  if (!me) throw new Error("Sesión requerida");
  await deleteDoc(doc(db, "Users", me, "blocked", targetUid));
}

export async function checkIsBlocked(targetUid: string): Promise<boolean> {
  const me = auth.currentUser?.uid;
  if (!me) return false;
  const snap = await getDoc(doc(db, "Users", me, "blocked", targetUid));
  return snap.exists();
}
