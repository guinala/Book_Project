import { useState, useRef } from "react";
import type { SearchFilter } from "../../types/Search";
import "./Searchbar.scss";
import { useTranslation } from "react-i18next";

type SearchBarProps = {
  onSearch?: (query: string, filter: SearchFilter) => void;
  placeholder?: string;
}

const FILTERS: { value: SearchFilter; label: string }[] = [
  { value: "todo", label: "search.all" },
  { value: "titulo", label: "search.title" },
  { value: "autor", label: "search.author" },
  { value: "isbn", label: "search.isbn" },
];

export default function SearchBar({
  onSearch,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<SearchFilter>("todo");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const handleSearch = () => {
    if (query.trim()) {
      onSearch?.(query.trim(), activeFilter);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const inputRowClass = [
    "searchbar__input-row",
    isFocused ? "searchbar__input-row--focused" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="searchbar">

      <div className="searchbar__filters">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={[
              "searchbar__filter-btn",
              activeFilter === f.value ? "searchbar__filter-btn--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setActiveFilter(f.value)}
          >
            {t(f.label)}
          </button>
        ))}
      </div>

      <div className={inputRowClass}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={t("explore.searchPlaceholder")}
          className="searchbar__input"
          aria-label={t("search.searchLabel")}
        />

        {query && (
          <button
            type="button"
            className="searchbar__clear-btn"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label={t("search.clearLabel")}
          >
            ✕
          </button>
        )}

        <button
          type="button"
          className="searchbar__search-btn"
          onClick={handleSearch}
          aria-label={t("search.searchBtnLabel")}
        >
          🔍
        </button>
      </div>

    </div>
  );
}