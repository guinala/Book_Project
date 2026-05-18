import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebaseInit";

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

export function isValidUsername(u: string): boolean {
  return USERNAME_REGEX.test(u);
}

export async function checkUsernameAvailable(
  username: string,
  currentUid?: string
): Promise<boolean> {
  const normalized = normalizeUsername(username);
  if (!isValidUsername(normalized)) return false;

  const snap = await getDoc(doc(db, "usernames", normalized));
  if (!snap.exists()) return true;

  return currentUid !== undefined && snap.data().uid === currentUid;
}

export async function lookupUidByUsername(
  username: string
): Promise<string | null> {
  const normalized = normalizeUsername(username);
  if (!isValidUsername(normalized)) return null;

  const snap = await getDoc(doc(db, "usernames", normalized));
  if (!snap.exists()) return null;
  return snap.data().uid ?? null;
}

export async function setUsername(
  uid: string,
  newUsername: string,
  oldUsername?: string
): Promise<void> {
  const normalizedNew = normalizeUsername(newUsername);
  if (!isValidUsername(normalizedNew)) {
    throw new Error("INVALID_USERNAME");
  }

  const normalizedOld = oldUsername ? normalizeUsername(oldUsername) : undefined;
  if (normalizedOld === normalizedNew) return;

  await runTransaction(db, async (tx) => {
    const newRef = doc(db, "usernames", normalizedNew);
    const oldRef = normalizedOld ? doc(db, "usernames", normalizedOld) : null;

    const newSnap = await tx.get(newRef);
    if (newSnap.exists() && newSnap.data().uid !== uid) {
      throw new Error("USERNAME_TAKEN");
    }

    if (oldRef) {
      const oldSnap = await tx.get(oldRef);
      if (oldSnap.exists() && oldSnap.data().uid !== uid) {
        throw new Error("OLD_USERNAME_MISMATCH");
      }
    }

    tx.set(newRef, { uid, reservedAt: serverTimestamp() });
    if (oldRef) {
      tx.delete(oldRef);
    }
    tx.update(doc(db, "Users", uid), { username: normalizedNew });
  });
}
