import { useTranslation } from "react-i18next";
import ListCard from "../ListCard/ListCard";
import type { ReadingList } from "../ListCard/ListCard";
import "./ListsSection.scss";

type ListsSectionProps = {
  lists: ReadingList[];
}

export default function ListsSection({ lists }: ListsSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="lists-section">
      <h3 className="lists-section__title">{t("myLibrary.listsTitle")}</h3>

      <div className="lists-section__grid">
        {lists.map((list) => (
          <ListCard key={list.id} list={list} />
        ))}
      </div>
    </section>
  );
}