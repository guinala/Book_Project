// src/components/ActivitySection/ActivitySection.tsx
import { useTranslation } from "react-i18next";
import type { ActivityItem as ActivityItemType } from "@/types/UserProfile";
import ActivityItem from "@/components/profile/sections/ActivityItem";
import "./ActivitySection.scss";

function ChevronRightSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

type ActivitySectionProps = {
  activity: ActivityItemType[];
};

export default function ActivitySection({ activity }: ActivitySectionProps) {
  const { t } = useTranslation();

  return (
    <div className="activity-section">
      <div className="activity-section__header">
        <h2 className="activity-section__title">Actividad reciente</h2>
        {activity.length > 3 && (
          <button type="button" className="activity-section__see-all">
            {t("myLibrary.seeAll")} <ChevronRightSmall />
          </button>
        )}
      </div>

      <div className="activity-section__card">
        {activity.length === 0 && (
          <p className="activity-section__empty">Sin actividad reciente</p>
        )}
        {activity.slice(0, 3).map((item, idx, arr) => (
          <div key={item.id}>
            <ActivityItem item={item} />
            {idx < arr.length - 1 && (
              <div className="activity-section__divider" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
