// src/components/ActivitySection/ActivitySection.tsx
import type { ActivityItem as ActivityItemType } from "@/types/UserProfile";
import ActivityItem from "@/components/ActivityItem/ActivityItem";
import "./ActivitySection.scss";

type ActivitySectionProps = {
  activity: ActivityItemType[];
};

export default function ActivitySection({ activity }: ActivitySectionProps) {
  return (
    <div className="activity-section">
      <div className="activity-section__header">
        <h2 className="activity-section__title">Actividad reciente</h2>
        {activity.length > 3 && (
          <button type="button" className="activity-section__more">
            Ver más
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>

      <div className="activity-section__card">
        {activity.length === 0 && (
          <p className="activity-section__empty">Sin actividad reciente</p>
        )}
        {activity.slice(0, 3).map((item, idx) => (
          <div key={item.id}>
            <ActivityItem item={item} />
            {idx < Math.min(activity.length, 3) - 1 && (
              <div className="activity-section__divider" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
