import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { completeBookTitles } from "@/services/api/bookComplete";
import { updateShelfBookTitleToDB, type ShelfEntry } from "@/services/firebase/firebaseLibrary";
import { logger } from "@/utils/logger";

type useShelfLangCompleteProps = {
  uid: string | null;
  ready: boolean;
  entries: Map<string, ShelfEntry>;
  lang: string;
  setEntries: Dispatch<SetStateAction<Map<string, ShelfEntry>>>;
};

export function useShelfLangComplete({ uid, ready, entries, lang, setEntries }: useShelfLangCompleteProps) {
  useEffect(() => {
    if (!uid || !ready || entries.size === 0) return;

    const booksMissing = [...entries.values()]
      .filter((e) => !e.book.titles?.[lang])
      .map((e) => e.book);

    if (booksMissing.length === 0) return;

    let cancelled = false;
    completeBookTitles(booksMissing, lang)
      .then((completedBooks) => {
        if (cancelled || completedBooks === booksMissing) return;
        const completedMap = new Map(completedBooks.map((b) => [b.key, b]));

        // Propagar al shelf doc también
        for (const completed of completedBooks) {
          if (completed.titles?.[lang]) {
            updateShelfBookTitleToDB(uid, completed.key, completed.titles[lang], lang, completed.isbns?.[lang])
              .catch((err) => logger.warn("[ShelfEnrich] Shelf update failed:", err));
          }
        }

        setEntries((prev) => {
          const next = new Map(prev);
          for (const [encoded, entry] of next.entries()) {
            const completed = completedMap.get(entry.book.key);
            if (!completed) continue;
            next.set(encoded, { ...entry, book: completed });
          }
          return next;
        });
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [uid, ready, entries.size, lang, setEntries, entries]);
}
