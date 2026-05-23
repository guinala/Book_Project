// src/services/firebase/firebaseFollows.ts
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db, functions } from "./firebaseInit";
import type { FollowRequest, UserMinimal } from "@/types/UserProfile";
import { getUserMinimal } from "./firebaseUsers";
import { httpsCallable } from "firebase/functions";
import { createFollowRequestNotification, deleteOwnFollowRequestNotifFrom } from "./firebaseNotifications";

// --- Callable Cloud Functions ---------------------------------------------
// Operaciones que escriben sobre documentos de OTRO usuario (aristas +
// contadores). Solo la función, que corre como admin, puede hacerlo.

const followUserFn = httpsCallable<{ targetUid: string }, { ok: boolean }>(
  functions,
  "followUser"
);
const unfollowUserFn = httpsCallable<{ targetUid: string }, { ok: boolean }>(
  functions,
  "unfollowUser"
);
const acceptFollowRequestFn = httpsCallable<
  { requesterUid: string },
  { ok: boolean }
>(functions, "acceptFollowRequest");


export async function followUser(targetUid: string): Promise<void> {
  await followUserFn({ targetUid });
}

export async function unfollowUser(targetUid: string): Promise<void> {
  await unfollowUserFn({ targetUid });
}

export async function acceptFollowRequest(requesterUid: string): Promise<void> {
  await acceptFollowRequestFn({ requesterUid });
}

// Solicitudes
/** Enviar una solicitud de seguimiento a un perfil privado. */
export async function sendFollowRequest(targetUid: string): Promise<void> {
  const me = auth.currentUser?.uid;
  if (!me) throw new Error("Sesión requerida");

  const profile = await getUserMinimal(me);
  if (!profile) throw new Error("Perfil del solicitante no encontrado");

  await setDoc(doc(db, "Users", targetUid, "followRequests", me), {
    requesterUid: me,
    createdAt: serverTimestamp(),
    requesterName: profile.name,
    requesterUsername: profile.username,
    requesterPhotoUrl: profile.profilePhotoUrl,
  });

  try {
    await createFollowRequestNotification(targetUid, profile);
  }
  catch (err) {
    console.warn("[sendFollowRequest] notif create failed", err);
  }
}

export async function cancelFollowRequest(targetUid: string): Promise<void> {
  const me = auth.currentUser?.uid;
  if (!me) throw new Error("Sesión requerida");
  await deleteDoc(doc(db, "Users", targetUid, "followRequests", me));
}

export async function rejectFollowRequest(requesterUid: string): Promise<void> {
  const me = auth.currentUser?.uid;
  if (!me) throw new Error("Sesión requerida");
  await deleteDoc(doc(db, "Users", me, "followRequests", requesterUid));

  //Limpiar notifiacion 
  try {
    await deleteOwnFollowRequestNotifFrom(me, requesterUid);
  } catch (err) {
    console.warn("[rejectFollowRequest] notif cleanup failed", err);
  }
}

// Consultas de estado
export async function checkIsFollowing(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const snap = await getDoc(
    doc(db, "Users", followerId, "following", followingId)
  );
  return snap.exists();
}

export async function checkHasPendingRequest(
  targetUid: string
): Promise<boolean> {
  const me = auth.currentUser?.uid;
  if (!me) return false;
  const snap = await getDoc(doc(db, "Users", targetUid, "followRequests", me));
  return snap.exists();
}

/** Solicitudes entrantes del usuario autenticado */
export async function getFollowRequests(): Promise<FollowRequest[]> {
  const me = auth.currentUser?.uid;
  if (!me) return [];
  const snap = await getDocs(
    query(
      collection(db, "Users", me, "followRequests"),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => d.data() as FollowRequest);
}

// Listados de seguidores / seguidos
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
