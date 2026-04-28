import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { AuthorBook, AuthorInfo } from "@/types/BookDetail";
import "./AuthorSection.scss";
import type { Book } from "@/types/Book";

type AuthorSectionProps = {
  authorInfo: AuthorInfo;
};

export default function AuthorSection({ authorInfo }: AuthorSectionProps) {
  const { t } = useTranslation();
  //const [photoError, setPhotoError] = useState(false);
  const [photoError, setPhotoError] = useState(!authorInfo.photoUrl)

  const toBookState = (book: AuthorBook): Book => ({
    key: book.id,
    title: book.title,
    authors: [authorInfo.name],
    first_publish_year: parseInt(book.year) || 0,
    cover_id: null,
    cover_url: book.cover_url,
    edition_count: 0,
    rating: book.rating,
    ratingCount: book.ratingCount,
    isbn: book.isbn,
    pages: book.pages,
  });

  const initials = authorInfo.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <section className="author-section">
      <h2 className="author-section__title">{t("bookDetail.authorTitle")}</h2>

      <div className="author-section__card">
        <div className="author-section__photo-wrap">
          {!photoError ? (
            <img
              className="author-section__photo"
              src={authorInfo.photoUrl}
              alt={authorInfo.name}
              onError={() => setPhotoError(true)}
            />
          ) : (
            <div className="author-section__photo-fallback" aria-hidden="true">
              {initials}
            </div>
          )}
        </div>

        <div className="author-section__info">
          <h3 className="author-section__name">{authorInfo.name}</h3>
          <div className="author-section__bio-card">
            <p className="author-section__bio">{authorInfo.bio}</p>
          </div>
        </div>
      </div>

      <div className="author-section__books-row">
        {authorInfo.books.map((book) => (
          <Link
            key={book.id}
            to={`/book/${encodeURIComponent(book.id)}`}
            state={{ book: toBookState(book) }}
            className="author-section__book"
          >
            <img
              className="author-section__book-cover"
              src={book.cover_url}
              alt={t("book.coverAlt", { title: book.title })}
            />
            <p className="author-section__book-title">{book.title}</p>
            <p className="author-section__book-year">{book.year}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}


