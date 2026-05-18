import "./BookInfoCardSkeleton.scss";

export default function BookInfoCardSkeleton() {
  return (
    <div className="book-info-card-skeleton">
      <div className="book-info-card-skeleton__cover" />
      <div className="book-info-card-skeleton__details">
        <div className="book-info-card-skeleton__line book-info-card-skeleton__line--genre" />
        <div className="book-info-card-skeleton__line book-info-card-skeleton__line--title" />
        <div className="book-info-card-skeleton__line book-info-card-skeleton__line--author" />
        <div className="book-info-card-skeleton__info-row" />
        <div className="book-info-card-skeleton__synopsis" />
        <div className="book-info-card-skeleton__footer">
          <div className="book-info-card-skeleton__button" />
        </div>
      </div>
    </div>
  );
}
