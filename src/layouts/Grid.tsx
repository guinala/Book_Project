const SKELETON_COUNT = 6;

function Grid() {
  return (
    <div className="booklist__skeleton-list">
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <div key={i} className="booklist__skeleton-row">
          <div className="booklist__skeleton-cover" />
          <div className="booklist__skeleton-info">
            <div className="booklist__skeleton-line booklist__skeleton-line--short" />
            <div className="booklist__skeleton-line" />
            <div className="booklist__skeleton-line booklist__skeleton-line--short" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default Grid