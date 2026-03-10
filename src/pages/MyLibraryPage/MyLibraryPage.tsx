import { useTranslation } from "react-i18next";
import CurrentReadingCard from "../../components/CurrentReadingCard/CurrentReadingCard";
import type { Book } from "../../types/Book";
import type { ReadingList } from "../../components/ListCard/ListCard";
import ShelfSection from "../../components/ShelfSection/ShelfSection";
import ListsSection from "../../components/ListsSection/ListsSection";
import "./MyLibraryPage.scss";

import shelfCover1 from "../../assets/covers/shelf-1.jpg";
import shelfCover2 from "../../assets/covers/shelf-2.jpg";
import shelfCover3 from "../../assets/covers/shelf-3.jpg";
import shelfCover4 from "../../assets/covers/shelf-4.jpg";
import shelfCover5 from "../../assets/covers/shelf-5.jpeg";

import listRec1 from "../../assets/covers/shelf-1.jpg";
import listRec2 from "../../assets/covers/shelf-3.jpg";
import listRec3 from "../../assets/covers/shelf-2.jpg";
import listRec4 from "../../assets/covers/shelf-5.jpeg";

import listDra1 from "../../assets/covers/shelf-4.jpg";
import listDra2 from "../../assets/covers/shelf-5.jpeg";
import listDra3 from "../../assets/covers/shelf-1.jpg";
import listDra4 from "../../assets/covers/shelf-3.jpg";

import listWom1 from "../../assets/covers/shelf-3.jpg";
import listWom2 from "../../assets/covers/shelf-1.jpg";
import listWom3 from "../../assets/covers/shelf-4.jpg";
import listWom4 from "../../assets/covers/shelf-5.jpeg";

const SHELF_BOOKS: Book[] = [
  {
    key: "shelf-1",
    title: "Fuego y Sangre",
    authors: ["George R.R Martin"],
    first_publish_year: 1967,
    cover_id: null,
    cover_url: shelfCover1,
    edition_count: 0,
  },
  {
    key: "shelf-2",
    title: "El Encuadernador",
    authors: ["Bridget Collins"],
    first_publish_year: 1949,
    cover_id: null,
    cover_url: shelfCover2,
    edition_count: 0,
  },
  {
    key: "shelf-3",
    title: "Donde los árboles cantan",
    authors: ["Laura Gallego"],
    first_publish_year: 1937,
    cover_id: null,
    cover_url: shelfCover3,
    edition_count: 0,
  },
  {
    key: "shelf-4",
    title: "Los Siete Maridos de Evelyn Hugo",
    authors: ["Taylor Jenkins Reid"],
    first_publish_year: 2001,
    cover_id: null,
    cover_url: shelfCover4,
    edition_count: 0,
  },
  {
    key: "shelf-5",
    title: "Harry Potter y la Piedra Filosofal",
    authors: ["J.K Rowling"],
    first_publish_year: 1963,
    cover_id: null,
    cover_url: shelfCover5,
    edition_count: 0,
  },
];

const READING_LISTS: ReadingList[] = [
  {
    id: "recommended",
    nameKey: "myLibrary.lists.recommended",
    count: 12,
    coverUrls: [listRec1, listRec2, listRec3, listRec4],
  },
  {
    id: "drama",
    nameKey: "myLibrary.lists.drama",
    count: 20,
    coverUrls: [listDra1, listDra2, listDra3, listDra4],
  },
  {
    id: "women",
    nameKey: "myLibrary.lists.women",
    count: 9,
    coverUrls: [listWom1, listWom2, listWom3, listWom4],
  }
];

function MyLibraryPage() {
  const { t } = useTranslation();

  return (
    <section className="my-library">
      <h2 className="my-library__heading">{t("myLibrary.heading")}</h2>

      <div className="my-library__reading-section">
        <CurrentReadingCard />
      </div>

      <div className="my-library__shelf-section">
        <ShelfSection books={SHELF_BOOKS} />
      </div>

      <div className="my-library__lists-section">
        <ListsSection lists={READING_LISTS} />
      </div>
    </section>
  );
}

export default MyLibraryPage;