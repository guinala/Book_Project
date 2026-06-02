import { createListDB, deleteListDB, getLists, updateListDB } from "@/services/firebase/firebaseLists";
import type { BookList, ListBook } from "@/types/BookList";
import { useCallback, useEffect, useState } from "react";

export function useLists(userId: string | undefined) {
    const [lists, setLists] = useState<BookList[]>([]);
    const [loading, setLoading] = useState(() => !!userId);
    const [prevUserId, setPrevUserId] = useState(userId);

    if (userId !== prevUserId) {
        setPrevUserId(userId);
        setLists([]);
        setLoading(!!userId);
    }

    useEffect(() => {
        if (!userId) {
            return;
        }

        let cancelled = false;
        getLists(userId)
            .then((l) => { if (!cancelled) setLists(l); })
            .catch(() => { if (!cancelled) setLists([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [userId]);

    const createList = useCallback(
        async (name: string, books: ListBook[], description?: string) => {
            if (!userId) {
                return;
            }
            const id = await createListDB(userId, name, books, description);
            const date = new Date().toISOString();
            setLists((prev) => [
                { id, name, description, books, createdAt: date, updatedAt: date},
                ...prev
            ])
        },
    [userId]);

    const updateList = useCallback(
        async (listId: string, content: { name?: string; description?: string; books?: ListBook[] }) => {
            if (!userId) {
                return;
            }
            const listsCol = lists;
            setLists((cur) =>
                cur.map((l) =>
                l.id === listId
                    ? { ...l, ...content, updatedAt: new Date().toISOString() }
                    : l,
                ),
            );
            try {
                await updateListDB(userId, listId, content);
            } catch {
                setLists(listsCol);
                throw new Error("update failed");
            }
        },
    [userId, lists]);

    const deleteList = useCallback(
        async (listId: string) => {
            if (!userId){
                return;
            }
            const listsCol = lists;
            setLists((cur) => cur.filter((l) => l.id !== listId));
            try {
                await deleteListDB(userId, listId);
            } catch {
                setLists(listsCol);
                throw new Error("delete failed");
            }
        },
    [userId, lists]);

    return { lists, loading, createList, updateList, deleteList };
}