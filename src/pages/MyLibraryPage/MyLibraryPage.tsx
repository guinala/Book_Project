import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import CurrentReadingCard from "@/components/CurrentReadingCard/CurrentReadingCard";
import type { ReadingList } from "@/components/ListCard/ListCard";
import ShelfSection from "@/components/ShelfSection/ShelfSection";
import ListsSection from "@/components/ListsSection/ListsSection";
import ProgressSection from "@/components/ProgressSection/ProgressSection";
import { useFantasyBooks_GoogleOpen } from "@/hooks/useFantasyBooks_GoogleOpen";
import "./MyLibraryPage.scss";

import listCover1 from "@/assets/covers/shelf-1.jpg";
import listCover2 from "@/assets/covers/shelf-2.jpg";
import listCover3 from "@/assets/covers/shelf-3.jpg";
import listCover4 from "@/assets/covers/shelf-4.jpg";
import listCover5 from "@/assets/covers/shelf-5.jpeg";

const READING_LISTS: ReadingList[] = [
  {
    id: "recommended",
    nameKey: "myLibrary.lists.recommended",
    count: 12,
    coverUrls: [listCover1, listCover3, listCover2, listCover5],
  },
  {
    id: "drama",
    nameKey: "myLibrary.lists.drama",
    count: 20,
    coverUrls: [listCover4, listCover5, listCover1, listCover3],
  },
  {
    id: "women",
    nameKey: "myLibrary.lists.women",
    count: 9,
    coverUrls: [listCover3, listCover1, listCover4, listCover5],
  },
];

function MyLibraryPage() {
  const { t, i18n } = useTranslation();
  const { books, loading, fetchBooks } = useFantasyBooks_GoogleOpen();

  useEffect(() => {
    fetchBooks(48, i18n.language);
  }, [fetchBooks, i18n.language]);

  return (
    <section className="my-library">
      <div className="my-library__reading-section">
        <h3 className="my-library__section-title">{t("myLibrary.heading")}</h3>
        <CurrentReadingCard book={books[1] ?? null} loading={loading} />
      </div>

      <div className="my-library__shelf-section">
        <ShelfSection books={books} loading={loading} />
      </div>

      <div className="my-library__lists-section">
        <ListsSection lists={READING_LISTS} />
      </div>

      <div className="my-library__progresses-section">
        <ProgressSection />
      </div>
    </section>
  );
}

export default MyLibraryPage;
