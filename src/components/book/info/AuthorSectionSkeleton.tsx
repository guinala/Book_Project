import "./AuthorSectionSkeleton.scss";

export default function AuthorSectionSkeleton() {
  return (
    <section className="author-section-skeleton">
      <div className="author-section-skeleton__title" />
      <div className="author-section-skeleton__card">
        <div className="author-section-skeleton__photo" />
        <div className="author-section-skeleton__info">
          <div className="author-section-skeleton__name" />
          <div className="author-section-skeleton__bio" />
        </div>
      </div>
      <div className="author-section-skeleton__books-row">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="author-section-skeleton__book">
            <div className="author-section-skeleton__book-cover" />
            <div className="author-section-skeleton__book-line author-section-skeleton__book-line--title" />
            <div className="author-section-skeleton__book-line author-section-skeleton__book-line--year" />
          </div>
        ))}
      </div>
    </section>
  );
}
