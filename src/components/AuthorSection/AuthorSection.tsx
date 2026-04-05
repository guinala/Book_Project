import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import type { AuthorInfo } from "@/types/BookDetail";
import "./AuthorSection.scss";

type AuthorSectionProps = {
  authorInfo: AuthorInfo;
};

export default function AuthorSection({ authorInfo }: AuthorSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  //const [photoError, setPhotoError] = useState(false);
  const [photoError, setPhotoError] = useState(!authorInfo.photoUrl)
  
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
          <div
            key={book.id}
            className="author-section__book"
            onClick={() => navigate(`/book/${book.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(`/book/${book.id}`)}
          >
            <img
              className="author-section__book-cover"
              src={book.cover_url}
              alt={t("book.coverAlt", { title: book.title })}
            />
            <p className="author-section__book-title">{book.title}</p>
            <p className="author-section__book-year">{book.year}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
