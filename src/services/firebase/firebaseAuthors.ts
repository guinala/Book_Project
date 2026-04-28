import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebaseInit";

export type AuthorData = {
  key: string;
  name: string;
  bio: string;
  photoUrl: string;
  cachedAt: string;
};

function encodeAuthorKey(authorKey: string): string {
  // Ejemplo: "/authors/OL23919A" → "OL23919A"
  return authorKey.split("/").at(-1) ?? authorKey;
}

export async function getAuthorFromDB(authorKey: string): Promise<AuthorData | null> {
  const refDoc = doc(db, "Authors", encodeAuthorKey(authorKey));
  const document = await getDoc(refDoc);

  if (!document.exists()) {
    return null;
  }

  return document.data() as AuthorData;
}

export async function saveAuthorToDB(
  authorKey: string,
  data: Omit<AuthorData, "cachedAt">
): Promise<void> {
  const ref = doc(db, "Authors", encodeAuthorKey(authorKey));
  await setDoc(ref, { ...data, cachedAt: new Date().toISOString() }, { merge: true });
}
