import { useTranslation } from "react-i18next";
import ShelfBookCard from "../ShelfBookCard/ShelfBookCard";
import type { Book } from "../../types/Book";
import "./ShelfSection.scss";

type ShelfSectionProps = {
  books: Book[];
}

export default function ShelfSection({ books }: ShelfSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="shelf-section">
      <h3 className="shelf-section__title">{t("myLibrary.shelfTitle")}</h3>

      <div className="shelf-section__track">
        {books.map((book) => (
          <div key={book.key} className="shelf-section__item">
            <ShelfBookCard book={book} />
          </div>
        ))}
      </div>
    </section>
  );
}