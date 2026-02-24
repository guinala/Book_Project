import { useState, useRef } from "react";
import "./SearchBar.css";

type SearchFilter = "todo" | "titulo" | "autor" | "isbn";

interface SearchBarProps {
  onSearch?: (query: string, filter: SearchFilter) => void;
  placeholder?: string;
  variant?: "hero" | "compact";
}

const FILTERS: { value: SearchFilter; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "titulo", label: "Título" },
  { value: "autor", label: "Autor" },
  { value: "isbn", label: "ISBN" },
];

export default function SearchBar({
  onSearch,
  placeholder = "Busca un libro, autor o ISBN…",
  variant = "hero",
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<SearchFilter>("todo");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCompact = variant === "compact";

  const handleSearch = () => {
    if (query.trim()) {
      onSearch?.(query.trim(), activeFilter);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const wrapperClass = ["searchbar", isCompact ? "searchbar--compact" : ""]
    .filter(Boolean)
    .join(" ");

  const inputRowClass = [
    "searchbar__input-row",
    isFocused ? "searchbar__input-row--focused" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClass}>

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
            {f.label}
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
          placeholder={placeholder}
          className="searchbar__input"
          aria-label="Buscar libros"
        />

        {query && (
          <button
            type="button"
            className="searchbar__clear-btn"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}

        <button
          type="button"
          className="searchbar__search-btn"
          onClick={handleSearch}
          aria-label="Buscar"
        >
          🔍
        </button>
      </div>

      {!isCompact && (
        <p className="searchbar__hint">
          Prueba: "Gabriel García Márquez", "Cien años de soledad", "978-84-376-0494-7"
        </p>
      )}

    </div>
  );
}