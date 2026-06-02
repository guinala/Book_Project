import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./LoadMoreSentinel.scss";

type LoadMoreSentinelProps = {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
};

export default function LoadMoreSentinel({ hasMore, loading, onLoadMore }: LoadMoreSentinelProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || loading) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  if (!hasMore) return null;

  return (
    <div className="load-more" ref={ref}>
      <button type="button" className="load-more__btn" onClick={onLoadMore} disabled={loading}>
        {loading ? "…" : t("explore.loadMore")}
      </button>
    </div>
  );
}
