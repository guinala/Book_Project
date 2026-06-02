import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperClass } from "swiper";
import { EffectCards, Keyboard } from "swiper/modules";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useShelf } from "@/context/shelf/useShelf";
import type { ShelfEntry } from "@/services/firebase/firebaseLibrary";
import UpdateProgressModal from "@/components/shelf/modals/UpdateProgressModal";
import HistoryModal from "@/components/shelf/modals/HistoryModal";
import { resolveCoverSrc } from "@/utils/coverImage";
import ReadingCardContent from "./ReadingCardContent";

import "swiper/css";
import "swiper/css/effect-cards";
import "./CurrentReadingCard.scss";

const STORAGE_KEY = "currentReadingBookKey";
const MAX_VISIBLE = 6;

function sortByRecency(a: ShelfEntry, b: ShelfEntry): number {
  const aTime = a.lastProgressAt ?? a.addedAt ?? "";
  const bTime = b.lastProgressAt ?? b.addedAt ?? "";
  return bTime.localeCompare(aTime);
}

function CurrentReadingCard() {
  const { t } = useTranslation();
  const { shelfByStatus, loading, getEntry } = useShelf();
  const swiperRef = useRef<SwiperClass | null>(null);
  const isSwiping = useRef(false);

  const simulateSwipe = (dir: "next" | "prev") => {
    const swiper = swiperRef.current;
    if (!swiper || isSwiping.current || swiper.animating) return;

    if (dir === "next" && swiper.isEnd) { swiper.slideNext(); return; }
    if (dir === "prev" && swiper.isBeginning) { swiper.slidePrev(); return; }

    const el = swiper.wrapperEl;
    const rect = el.getBoundingClientRect();
    const y = rect.top + rect.height / 2;
    const startX = rect.left + rect.width / 2;
    const totalDx = (dir === "next" ? -1 : 1) * rect.width * 0.6;
    const frames = 12;

    const fire = (type: string, x: number) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 1,
          pointerType: "touch",
          isPrimary: true,
          button: 0,
          buttons: type === "pointerup" ? 0 : 1,
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
        })
      );

    isSwiping.current = true;
    fire("pointerdown", startX);

    let frame = 0;
    const step = () => {
      frame += 1;
      fire("pointermove", startX + (totalDx * frame) / frames);
      if (frame < frames) {
        requestAnimationFrame(step);
      } else {
        fire("pointerup", startX + totalDx);
        isSwiping.current = false;
      }
    };
    requestAnimationFrame(step);
  };

  const goNext = () => simulateSwipe("next");
  const goPrev = () => simulateSwipe("prev");

  const topReading = useMemo(() => {
    const entries: ShelfEntry[] = [];
    for (const book of shelfByStatus.reading) {
      const entry = getEntry(book.key);
      if (entry) entries.push(entry);
    }
    return entries.sort(sortByRecency).slice(0, MAX_VISIBLE);
  }, [shelfByStatus.reading, getEntry]);

  const [selectedKey, setSelectedKey] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );
  
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const activeEntry: ShelfEntry | null = useMemo(() => {
    if (topReading.length === 0) return null;
    const found = selectedKey
      ? topReading.find((e) => e.book.key === selectedKey)
      : undefined;
    return found ?? topReading[0];
  }, [topReading, selectedKey]);

  useEffect(() => {
    if (activeEntry && activeEntry.book.key !== selectedKey) {
      setSelectedKey(activeEntry.book.key);
    }
  }, [activeEntry, selectedKey]);

  useEffect(() => {
    if (selectedKey) localStorage.setItem(STORAGE_KEY, selectedKey);
  }, [selectedKey]);

  const currentIndex = useMemo(() => {
    if (!selectedKey) return 0;
    const idx = topReading.findIndex((e) => e.book.key === selectedKey);
    return idx >= 0 ? idx : 0;
  }, [topReading, selectedKey]);

  if (loading) {
    return <div className="reading-card reading-card--skeleton" />;
  }

  const hasBooks = topReading.length > 0;
  const showChevrons = topReading.length > 1;

  return (
    <>
      <section
        className="reading-carousel"
        role="region"
        aria-roledescription="carousel"
        aria-label={t("myLibrary.heading")}
      >
        <div className="reading-carousel__header">
          <h2 className="reading-carousel__heading">{t("myLibrary.heading")}</h2>
          {hasBooks && (
            <span className="reading-carousel__count">
              {t("myLibrary.readingCount", { current: currentIndex + 1, total: topReading.length })}
            </span>
          )}
        </div>

        {!hasBooks && (
          <div className="reading-card__empty-state">
            <p className="reading-card__empty-state-text">
              {t("myLibrary.noCurrentReading")}
            </p>
          </div>
        )}

        {hasBooks && (
          <div className="reading-carousel__stage">
            {showChevrons && (
              <button
                type="button"
                className="reading-carousel__chevron reading-carousel__chevron--prev"
                onClick={goPrev}
                aria-label={t("myLibrary.prevBook")}
              >
                <ChevronLeft />
              </button>
            )}

            <Swiper
              modules={[EffectCards, Keyboard]}
              effect="cards"
              cardsEffect={{
                perSlideOffset: 4,
                perSlideRotate: 3,
                rotate: true,
                slideShadows: true,
              }}
              rewind={topReading.length > 1}
              grabCursor
              keyboard={{ enabled: true, onlyInViewport: true }}
              initialSlide={currentIndex}
              onSwiper={(s) => { swiperRef.current = s; }}
              onSlideChange={(s) => {
                const next = topReading[s.realIndex];
                if (next) setSelectedKey(next.book.key);
              }}
              className="reading-carousel__swiper"
            >

              {topReading.map((entry) => (
                <SwiperSlide key={entry.book.key} className="reading-carousel__slide">
                  <ReadingCardContent
                    entry={entry}
                    onOpenHistory={() => {
                      setSelectedKey(entry.book.key);
                      setIsHistoryModalOpen(true);
                    }}
                    onOpenUpdate={() => {
                      setSelectedKey(entry.book.key);
                      setIsUpdateModalOpen(true);
                    }}
                  />
                </SwiperSlide>
              ))}
            </Swiper>

            {showChevrons && (
              <button
                type="button"
                className="reading-carousel__chevron reading-carousel__chevron--next"
                onClick={goNext}
                aria-label={t("myLibrary.nextBook")}
              >
                <ChevronRight />
              </button>
            )}
          </div>
        )}
      </section>

      {isUpdateModalOpen && activeEntry && (
        <UpdateProgressModal
          entry={activeEntry}
          onClose={() => setIsUpdateModalOpen(false)}
        />
      )}

      {isHistoryModalOpen && activeEntry && (
        <HistoryModal
          bookId={activeEntry.book.key}
          bookTitle={activeEntry.book.title}
          bookAuthor={activeEntry.book.authors.join(", ")}
          bookCoverUrl={resolveCoverSrc(activeEntry.book) ?? undefined}
          totalPages={activeEntry.book.pages ?? 0}
          onClose={() => setIsHistoryModalOpen(false)}
        />
      )}
    </>
  );
}

export default CurrentReadingCard;
