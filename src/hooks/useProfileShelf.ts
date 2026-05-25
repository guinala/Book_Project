import { useEffect, useState } from "react";
import { useShelf } from "./useShelf";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import { getShelf } from "@/services/firebase/firebaseLibrary";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import { groupShelfByStatus } from "@/utils/shelf";

const EMPTY_SHELF: Record<ShelfStatus, Book[]> = {
  wantToRead: [], reading: [], finished: [], didNotFinish: [],
};

export function useProfileShelf(userId: string, isOwnProfile: boolean, canViewFull: boolean) {
  const { shelfByStatus, loading: ownShelfLoading } = useShelf();
  const { lang } = useCurrentLanguage();
  const [publicShelf, setPublicShelf] = useState<Record<ShelfStatus, Book[]>>(EMPTY_SHELF);
  const [publicLoading, setPublicLoading] = useState(false);
  const [prevKey, setPrevKey] = useState({ userId, isOwnProfile, canViewFull });

  if (prevKey.userId !== userId || prevKey.isOwnProfile !== isOwnProfile || prevKey.canViewFull !== canViewFull) {
    setPrevKey({ userId, isOwnProfile, canViewFull });
    setPublicShelf(EMPTY_SHELF);
    const enabled = !!userId && !isOwnProfile && canViewFull;
    setPublicLoading(enabled);
  }

  useEffect(() => {
    if (!userId || isOwnProfile || !canViewFull) {
      return;
    }
    let cancelled = false;
    getShelf(userId)
      .then((entries) => { if (!cancelled) setPublicShelf(groupShelfByStatus(entries ?? [], lang)); })
      .finally(() => { if (!cancelled) setPublicLoading(false); });
    return () => { cancelled = true; };
  }, [userId, isOwnProfile, canViewFull, lang]);


  return {
    shelf: isOwnProfile ? shelfByStatus : publicShelf,
    loading: isOwnProfile ? ownShelfLoading : publicLoading,
  };
}
