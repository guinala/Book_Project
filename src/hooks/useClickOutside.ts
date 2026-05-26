import { useEffect } from "react";

type ElementRef = {
  current: HTMLElement | null;
};

export function useClickOutside<T extends HTMLElement>(
  ref: { current: T | null },
  handler: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const onMouseDown = (e: MouseEvent) => {
      if (!(e.target instanceof Node)) return;
      const target = e.target;
      if (ref.current && !ref.current.contains(target)) {
        handler();
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [ref, handler, enabled]);
}

export function useClickOutsideMany(
  refs: ElementRef[],
  handler: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const onMouseDown = (e: MouseEvent) => {
      if (!(e.target instanceof Node)) return;
      const target = e.target;
      const isInsideAny = refs.some((ref) => ref.current?.contains(target));

      if (!isInsideAny) {
        handler();
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [refs, handler, enabled]);
}
