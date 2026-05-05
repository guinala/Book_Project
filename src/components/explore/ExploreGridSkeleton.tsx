import "./ExploreGridSkeleton.scss";

export default function ExploreGridSkeleton() {
  return (
    <div className="explore-grid-skeleton">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="explore-grid-skeleton__card">
          <div className="explore-grid-skeleton__cover" />
          <div className="explore-grid-skeleton__line explore-grid-skeleton__line--title" />
          <div className="explore-grid-skeleton__line explore-grid-skeleton__line--author" />
        </div>
      ))}
    </div>
  );
}
