import { onCall, HttpsError } from "firebase-functions/https";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const REGION = "europe-west1";

export const followUser = onCall({ region: REGION }, async (request) => {
  const followerId = request.auth?.uid;
  if (!followerId) {
    throw new HttpsError("unauthenticated", "Sesión requerida");
  }
  const targetId = request.data?.targetUid as string | undefined;
  if (!targetId || targetId === followerId) {
    throw new HttpsError("invalid-argument", "targetUid inválido");
  }

  const db = admin.firestore();
  const targetSnap = await db.doc(`Users/${targetId}`).get();
  if (!targetSnap.exists) {
    throw new HttpsError("not-found", "Usuario no encontrado");
  }
  if (targetSnap.data()?.isPublic === false) {
    throw new HttpsError(
      "failed-precondition",
      "Perfil privado: usa una solicitud"
    );
  }

  const followingRef = db.doc(`Users/${followerId}/following/${targetId}`);
  if ((await followingRef.get()).exists) {
    return { ok: true }; // idempotente
  }

  const ts = admin.firestore.FieldValue.serverTimestamp();
  const inc = admin.firestore.FieldValue.increment(1);
  const batch = db.batch();
  batch.set(followingRef, { createdAt: ts });
  batch.set(db.doc(`Users/${targetId}/followers/${followerId}`), {
    createdAt: ts,
  });
  batch.update(db.doc(`Users/${followerId}`), { followingCount: inc });
  batch.update(db.doc(`Users/${targetId}`), { followersCount: inc });
  await batch.commit();
  return { ok: true };
});

export const unfollowUser = onCall({ region: REGION }, async (request) => {
  const followerId = request.auth?.uid;
  if (!followerId) {
    throw new HttpsError("unauthenticated", "Sesión requerida");
  }
  const targetId = request.data?.targetUid as string | undefined;
  if (!targetId || targetId === followerId) {
    throw new HttpsError("invalid-argument", "targetUid inválido");
  }

  const db = admin.firestore();
  const followingRef = db.doc(`Users/${followerId}/following/${targetId}`);
  if (!(await followingRef.get()).exists) {
    return { ok: true }; 
  }

  const dec = admin.firestore.FieldValue.increment(-1);
  const batch = db.batch();
  batch.delete(followingRef);
  batch.delete(db.doc(`Users/${targetId}/followers/${followerId}`));
  batch.update(db.doc(`Users/${followerId}`), { followingCount: dec });
  batch.update(db.doc(`Users/${targetId}`), { followersCount: dec });
  await batch.commit();
  return { ok: true };
});

/** Aceptar una solicitud de seguimiento entrante. La ejecuta el dueño del perfil. */
export const acceptFollowRequest = onCall(
  { region: REGION },
  async (request) => {
    const targetId = request.auth?.uid; // el que acepta = dueño del perfil
    if (!targetId) {
      throw new HttpsError("unauthenticated", "Sesión requerida");
    }
    const requesterId = request.data?.requesterUid as string | undefined;
    if (!requesterId) {
      throw new HttpsError("invalid-argument", "requesterUid inválido");
    }

    const db = admin.firestore();
    const reqRef = db.doc(`Users/${targetId}/followRequests/${requesterId}`);
    if (!(await reqRef.get()).exists) {
      throw new HttpsError("not-found", "No hay solicitud de ese usuario");
    }

    const followingRef = db.doc(`Users/${requesterId}/following/${targetId}`);
    // Si ya existe la arista (doble-click, reintento), solo limpia la solicitud.
    if ((await followingRef.get()).exists) {
      await reqRef.delete();
      return { ok: true };
    }

    const ts = admin.firestore.FieldValue.serverTimestamp();
    const inc = admin.firestore.FieldValue.increment(1);
    const batch = db.batch();
    batch.set(followingRef, { createdAt: ts });
    batch.set(db.doc(`Users/${targetId}/followers/${requesterId}`), {
      createdAt: ts,
    });
    batch.update(db.doc(`Users/${requesterId}`), { followingCount: inc });
    batch.update(db.doc(`Users/${targetId}`), { followersCount: inc });
    batch.delete(reqRef);
    await batch.commit();
    return { ok: true };
  }
);
