import { useState, useRef } from "react";
import type { SearchFilter } from "@/types/Search";
import "./Searchbar.scss";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";

type SearchBarProps = {
  onSearch?: (query: string, filter: SearchFilter) => void;
  placeholder?: string;
  initialQuery?: string;
}

export default function SearchBar({ onSearch, initialQuery = "" }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const handleSearch = () => {
    if (query.trim()) {
      onSearch?.(query.trim(), "todo");
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
      <h2 className="searchbar__title">{t("explore.searchTitle")}</h2>

      <div className={inputRowClass}>
        <span className="searchbar__icon" aria-hidden="true">
          <Search size={18} aria-hidden="true" />
        </span>

        <div className="searchbar__divider" />

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
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
