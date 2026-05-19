import type { BookList, ListBook } from "@/types/BookList";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseInit";

function mapListDoc(id: string, d: Record<string, unknown>): BookList {
    return {
        id,
        name: (d.name as string) ?? "",
        books: (d.books as ListBook[]) ?? [],
        createdAt: (d.createdAt as string) ?? "",
        updatedAt: (d.updatedAt as string) ?? "",
    };
}

export async function getLists(uid: string): Promise<BookList[]> {
    const userLists = await getDocs(collection(db, "Users", uid, "lists"));
    return userLists.docs
        .map((doc) => mapListDoc(doc.id, doc.data()))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getList(uid: string, listId: string): Promise<BookList | null> {
  const listDoc = await getDoc(doc(db, "Users", uid, "lists", listId));
  if (!listDoc.exists()) return null;
  return mapListDoc(listDoc.id, listDoc.data());
}

export async function createList(
    uid: string, name: string, books: ListBook[],
): Promise<string> {
    const ref = doc(collection(db, "Users", uid, "lists"));
    const date = new Date().toISOString();
    await setDoc(ref, { name, books, createdAt: date, updatedAt: date});
    return ref.id;
}

export async function updateList(
  uid: string,
  listId: string,
  content: { name?: string; books?: ListBook[] },
): Promise<void> {
  await updateDoc(doc(db, "Users", uid, "lists", listId), {
    ...content,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteList(uid: string, listId: string): Promise<void> {
  await deleteDoc(doc(db, "Users", uid, "lists", listId));
}