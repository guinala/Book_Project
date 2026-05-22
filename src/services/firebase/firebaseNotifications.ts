import { addDoc, collection, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, where, writeBatch, type Unsubscribe} from "firebase/firestore";
import { db } from "./firebaseInit";
import type { Notification, UserMinimal } from "@/types/UserProfile";

const COLLECTION = (uid: string) => collection(db, "Users", uid, "notifications");

export async function getNotifications(
    uid: string,
    maxResults = 50
): Promise<Notification[]> {
    const notifs = await getDocs(query(COLLECTION(uid), orderBy("createdAt", "desc"), limit(maxResults)));

    return notifs.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Notification, "id">),
    }));
}

// Listener
export function subscribeToNotifications(
  uid: string,
  onChange: (items: Notification[]) => void
): Unsubscribe {
    return onSnapshot(
        query(COLLECTION(uid), orderBy("createdAt", "desc"), limit(50)),
        (snap) => {
        onChange(
            snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Notification, "id">),
            }))
        );
        }
    );
}

export async function markAllAsRead(uid: string): Promise<void> {
    const notifs = await getDocs(query(COLLECTION(uid), where("read", "==", false)));
    if(notifs.empty) {
        return;
    }
    const batch = writeBatch(db);
    notifs.docs.forEach((doc) => batch.update(doc.ref, { read: true}));
    await batch.commit();
}

export async function deleteNotification(
    uid: string,
    notifId: string,
): Promise<void> {
    await deleteDoc(doc(db, "Users", uid, "notifications", notifId));
}

export async function createFollowRequestNotification(
    targetUid: string,
    actor: UserMinimal
): Promise<void> {
    await addDoc(COLLECTION(targetUid), {
        type: "follow_request",
        actorUid: actor.uid,
        actorName: actor.name,
        actorUsername: actor.username,
        actorPhotoUrl: actor.profilePhotoUrl,
        createdAt: serverTimestamp(),
        read: false,
    })
}

export async function deleteOwnFollowRequestNotifFrom(
    uid: string,
    actorUid: string
): Promise<void> {
    const notifs = await getDocs(
        query(COLLECTION(uid), where("type", "==", "follow_request"), where("actorUid", "==", actorUid))
    );

    if(notifs.empty) {
        return;
    }

    const batch = writeBatch(db);
    notifs.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
}