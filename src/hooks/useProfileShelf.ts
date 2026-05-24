import { useEffect, useState } from "react";
import { useShelf } from "./useShelf";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import { getShelf } from "@/services/firebase/firebaseLibrary";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";

const EMPTY_SHELF: Record<ShelfStatus, Book[]> = {
  wantToRead: [], reading: [], finished: [], didNotFinish: [],
};

function entriesToShelf(
  entries: { book: Book; status: ShelfStatus }[],
  lang: string,
): Record<ShelfStatus, Book[]> {
  const result: Record<ShelfStatus, Book[]> = {
    wantToRead: [], reading: [], finished: [], didNotFinish: [],
  };
  for (const { book, status } of entries) {
    result[status].push({
      ...book,
      title: book.titles?.[lang] ?? book.titles?.es ?? book.titles?.en ?? book.title ?? "",
      isbn: book.isbns?.[lang] ?? book.isbns?.es ?? book.isbns?.en ?? book.isbn,
    });
  }
  return result;
}

export function useProfileShelf(userId: string, isOwnProfile: boolean, canViewFull: boolean) {
  const { shelfByStatus, loading: ownShelfLoading } = useShelf();
  const { lang } = useCurrentLanguage();
  const [publicShelf, setPublicShelf] = useState<Record<ShelfStatus, Book[]>>(EMPTY_SHELF);
  const [publicLoading, setPublicLoading] = useState(false);

  useEffect(() => {
    if (!userId || isOwnProfile || !canViewFull) {
      setPublicShelf(EMPTY_SHELF);
      setPublicLoading(false);
      return;
    }
    let cancelled = false;
    setPublicLoading(true);
    getShelf(userId)
      .then((entries) => { if (!cancelled) setPublicShelf(entriesToShelf(entries ?? [], lang)); })
      .finally(() => { if (!cancelled) setPublicLoading(false); });
    return () => { cancelled = true; };
  }, [userId, isOwnProfile, canViewFull, lang]);

  return {
    shelf: isOwnProfile ? shelfByStatus : publicShelf,
    loading: isOwnProfile ? ownShelfLoading : publicLoading,
  };
}
