"use client";

import { useEffect } from "react";

/**
 * Inertial page scrolling for mouse wheels / trackpads — the long, eased
 * glide of the reference. No dependency: wheel input moves a target and a
 * rAF loop eases the real scroll position toward it.
 *
 * Left native on purpose:
 *  - touch devices (they already have momentum scrolling)
 *  - prefers-reduced-motion
 *  - ctrl/⌘ + wheel (zoom), horizontal gestures
 *  - wheel over any element that scrolls on its own (modals, lists) or
 *    anything inside [data-native-scroll]
 * Keyboard, scrollbar drag and anchor jumps keep working: when the page
 * moves without us, the target re-syncs to it.
 */
export function SmoothScroll({
  /** 0‥1 — fraction of the remaining distance covered per 60 fps frame */
  ease = 0.085,
  /** wheel distance multiplier */
  speed = 1,
}: {
  ease?: number;
  speed?: number;
}) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || coarse) return;

    const root = document.documentElement;
    // CSS smooth-behaviour would fight the per-frame scrollTo calls
    const prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    const maxScroll = () => root.scrollHeight - window.innerHeight;
    let target = window.scrollY;
    let current = window.scrollY;
    let raf = 0;
    let last = 0;
    let running = false;

    const canScrollItself = (el: Element | null, dy: number) => {
      while (el && el !== document.body && el !== root) {
        if ((el as HTMLElement).closest?.("[data-native-scroll]")) return true;
        const style = getComputedStyle(el);
        const oy = style.overflowY;
        if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) {
          const atTop = el.scrollTop <= 0;
          const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
          if ((dy < 0 && !atTop) || (dy > 0 && !atBottom)) return true;
        }
        el = el.parentElement;
      }
      return false;
    };

    const tick = (now: number) => {
      const dt = last ? Math.min(64, now - last) / (1000 / 60) : 1;
      last = now;
      const a = 1 - Math.pow(1 - ease, dt); // frame-rate independent
      current += (target - current) * a;
      if (Math.abs(target - current) < 0.5) {
        current = target;
        running = false;
      }
      window.scrollTo({ top: current, behavior: "instant" as ScrollBehavior });
      if (running) raf = requestAnimationFrame(tick);
      else last = 0;
    };

    const start = () => {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(tick);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (canScrollItself(e.target as Element, e.deltaY)) return;

      e.preventDefault();
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= window.innerHeight;

      if (!running) current = window.scrollY;
      target = Math.max(0, Math.min(maxScroll(), target + dy * speed));
      if (!running) target = Math.max(0, Math.min(maxScroll(), window.scrollY + dy * speed));
      start();
    };

    // keyboard / scrollbar / anchor jumps move the page without us
    const onScroll = () => {
      if (!running) {
        target = window.scrollY;
        current = window.scrollY;
      }
    };
    const onResize = () => {
      target = Math.min(target, maxScroll());
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      root.style.scrollBehavior = prevBehavior;
    };
  }, [ease, speed]);

  return null;
}
