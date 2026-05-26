import { useDebouncedBookSearch } from "@/hooks/useDebouncedBookSearch";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import type { Book } from "@/types/Book";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type BookSearchPickerProps = {
  selected: { key: string }[];
  max: number;
  onAdd: (book: Book) => void;
  translationPrefix: string;
  classNames?: Partial<{
    search: string;
    searching: string;
    noResults: string;
    results: string;
    resultItem: string;
    resultCover: string;
    resultTitle: string;
    resultAuthor: string;
  }>;
};

export default function BookSearchPicker({
  selected,
  max,
  onAdd,
  translationPrefix,
  classNames,
}: BookSearchPickerProps) {
  const { t } = useTranslation();
  const { lang } = useCurrentLanguage();
  const [query, setQuery] = useState("");
  const { results, searching } = useDebouncedBookSearch(query, { lang });

  if (selected.length >= max) return null;

  const handleAdd = (book: Book) => {
    if (selected.some((s) => s.key === book.key)) return;
    onAdd(book);
    setQuery("");
  };

  return (
    <>
      <input
        className={classNames?.search}
        type="text"
        placeholder={t(`${translationPrefix}.searchPlaceholder`)}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {searching && (
        <p className={classNames?.searching}>
          {t(`${translationPrefix}.searching`)}
        </p>
      )}

      {!searching && query.trim() && results.length === 0 && (
        <p className={classNames?.noResults}>
          {t(`${translationPrefix}.noResults`)}
        </p>
      )}

      {results.length > 0 && (
        <ul className={classNames?.results}>
          {results.map((book) => (
            <li key={book.key}>
              <button
                type="button"
                className={classNames?.resultItem}
                onClick={() => handleAdd(book)}
                disabled={selected.some((s) => s.key === book.key)}
              >
                {book.cover_url && (
                  <img
                    className={classNames?.resultCover}
                    src={book.cover_url}
                    alt=""
                    aria-hidden="true"
                  />
                )}
                <div>
                  <p className={classNames?.resultTitle}>{book.title}</p>
                  <p className={classNames?.resultAuthor}>{book.authors[0]}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}