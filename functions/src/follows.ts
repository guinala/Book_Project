import { onCall, HttpsError } from "firebase-functions/https";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

async function buildActorPayload(
  db: admin.firestore.Firestore,
  actorUid: string
): Promise<{
  actorUid: string;
  actorName: string;
  actorUsername: string;
  actorPhotoUrl: string;
}> {
  const snap = await db.doc(`Users/${actorUid}`).get();
  const d = snap.data() ?? {};
  return {
    actorUid,
    actorName: (d.name as string) ?? "",
    actorUsername: (d.username as string) ?? "",
    actorPhotoUrl: (d.profilePhotoUrl as string) ?? "",
  };
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

  const actor = await buildActorPayload(db, followerId);
  const ts = admin.firestore.FieldValue.serverTimestamp();
  const inc = admin.firestore.FieldValue.increment(1);
  const notifRef = db.collection(`Users/${targetId}/notifications`).doc();

  const batch = db.batch();
  batch.set(followingRef, { createdAt: ts });
  batch.set(db.doc(`Users/${targetId}/followers/${followerId}`), {
    createdAt: ts,
  });
  batch.update(db.doc(`Users/${followerId}`), { followingCount: inc });
  batch.update(db.doc(`Users/${targetId}`), { followersCount: inc });
  batch.set(notifRef, {
    type: "follow",
    ...actor,
    createdAt: ts,
    read: false,
  });
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

  await db.runTransaction(async (tx) => {
    const followerDoc = await tx.get(db.doc(`Users/${followerId}`));
    const targetDoc = await tx.get(db.doc(`Users/${targetId}`));
    const followingNow = (followerDoc.data()?.followingCount as number) ?? 0;
    const followersNow = (targetDoc.data()?.followersCount as number) ?? 0;
    tx.delete(followingRef);
    tx.delete(db.doc(`Users/${targetId}/followers/${followerId}`));
    tx.update(db.doc(`Users/${followerId}`), { followingCount: Math.max(0, followingNow - 1) });
    tx.update(db.doc(`Users/${targetId}`), { followersCount: Math.max(0, followersNow - 1) });
  });
  return { ok: true };
});

/** Eliminar a alguien de los propios seguidores. Lo ejecuta el dueño del perfil. */
export const removeFollower = onCall({ region: REGION }, async (request) => {
  const targetId = request.auth?.uid;
  if (!targetId) {
    throw new HttpsError("unauthenticated", "Sesión requerida");
  }
  const followerUid = request.data?.followerUid as string | undefined;
  if (!followerUid || followerUid === targetId) {
    throw new HttpsError("invalid-argument", "followerUid inválido");
  }

  const db = admin.firestore();
  const followerRef = db.doc(`Users/${targetId}/followers/${followerUid}`);
  if (!(await followerRef.get()).exists) {
    return { ok: true };
  }

  await db.runTransaction(async (tx) => {
    const targetDoc = await tx.get(db.doc(`Users/${targetId}`));
    const followerDoc = await tx.get(db.doc(`Users/${followerUid}`));
    const followersNow = (targetDoc.data()?.followersCount as number) ?? 0;
    const followingNow = (followerDoc.data()?.followingCount as number) ?? 0;
    tx.delete(followerRef);
    tx.delete(db.doc(`Users/${followerUid}/following/${targetId}`));
    tx.update(db.doc(`Users/${targetId}`), { followersCount: Math.max(0, followersNow - 1) });
    tx.update(db.doc(`Users/${followerUid}`), { followingCount: Math.max(0, followingNow - 1) });
  });
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

    // Notificación huérfana
    const staleNotif = await db
      .collection(`Users/${targetId}/notifications`)
      .where("type", "==", "follow_request")
      .where("actorUid", "==", requesterId)
      .get();

    const followingRef = db.doc(`Users/${requesterId}/following/${targetId}`);
    if ((await followingRef.get()).exists) {
      const cleanup = db.batch();
      staleNotif.docs.forEach((d) => cleanup.delete(d.ref));
      cleanup.delete(reqRef);
      await cleanup.commit();
      return { ok: true };
    }

    const actor = await buildActorPayload(db, targetId);
    const ts = admin.firestore.FieldValue.serverTimestamp();
    const inc = admin.firestore.FieldValue.increment(1);
    const notifRef = db
      .collection(`Users/${requesterId}/notifications`)
      .doc();

    const batch = db.batch();
    batch.set(followingRef, { createdAt: ts });
    batch.set(db.doc(`Users/${targetId}/followers/${requesterId}`), {
      createdAt: ts,
    });
    batch.update(db.doc(`Users/${requesterId}`), { followingCount: inc });
    batch.update(db.doc(`Users/${targetId}`), { followersCount: inc });
    batch.set(notifRef, {
      type: "follow_request_accepted",
      ...actor,
      createdAt: ts,
      read: false,
    });
    batch.delete(reqRef);
    staleNotif.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return { ok: true };
  }
);
