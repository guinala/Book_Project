import { useState, useRef } from "react";
import type { SearchFilter } from "@/types/Search";
import "./Searchbar.scss";
import { useTranslation } from "react-i18next";

type SearchBarProps = {
  onSearch?: (query: string, filter: SearchFilter) => void;
  placeholder?: string;
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");
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
      <h2 className="searchbar__title">Descubre tu próxima trama</h2>

      <div className={inputRowClass}>
        <span className="searchbar__icon" aria-hidden="true">
          <SearchIcon />
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
