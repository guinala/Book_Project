import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseInit";

export type AuthorData = {
  key: string;
  name: string;
  bio: Record<string, string>; 
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

  const data = document.data();
  const bioField = data.bio as string | Record<string, string> | undefined;

  //Por si alguna biografía aún está en string
  const bio : Record<string, string> = typeof bioField === 'string' ? { es: bioField } : (bioField ?? {});

  return {
    key: data.key,
    name: data.name,
    bio,
    photoUrl: data.photoUrl ?? '',
    cachedAt: data.cachedAt ?? '',
  };
}

export function resolveBio(bio: Record<string, string>, lang: string): string {
  return bio[lang] ?? bio['es'] ?? bio['en'] ?? '';
}

export async function saveAuthorToDB(
  authorKey: string,
  data: { key: string; name: string; bio: string; photoUrl: string },
  lang = 'es'
): Promise<void> {
  const ref = doc(db, "Authors", encodeAuthorKey(authorKey));
  // Paso 1: crear/actualizar campos no-bio con merge para no sobreescribir
  // otros idiomas si dos usuarios llegan simultáneamente por primera vez
  await setDoc(ref, {
    key: data.key,
    name: data.name,
    photoUrl: data.photoUrl,
    cachedAt: new Date().toISOString(),
  }, { merge: true });
  // Paso 2: escribir bio.{lang} con dot-notation para no pisar otros idiomas
  await updateDoc(ref, { [`bio.${lang}`]: data.bio });
}

export async function updateAuthorBioToDB(
  authorKey: string,
  bio: string,
  lang: string
): Promise<void> {
  const ref = doc(db, "Authors", encodeAuthorKey(authorKey));
  await updateDoc(ref, { [`bio.${lang}`]: bio });
}
