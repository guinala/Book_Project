import Grid from "../../layouts/Grid";
import type { Book } from "../../types/Book";
import BookCard from "../BookCard/BookCard";
import "./BookList.scss";

type BookListProps = {
  books: Book[];
  loading: boolean;
  error: string | null;
  title: string;
}

export default function BookList({ books, loading, error, title }: BookListProps) {
  if (loading) {
    return (
      <section className="booklist">
        <h2 className="booklist__title">{title}</h2>
        <Grid />
      </section>
    );
  }

  if (error) {
    return (
      <section className="booklist">
        <h2 className="booklist__title">{title}</h2>
        <p className="booklist__status booklist__status--error">⚠️ {error}</p>
      </section>
    );
  }

  return (
    <section className="booklist">
      <h2 className="booklist__title">{title}</h2>
      <div className="booklist__list">
        {books.map((book) => (
          <BookCard key={book.key} book={book} />
        ))}
      </div>
    </section>
  );
}