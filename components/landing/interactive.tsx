"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ---------- Reveal on scroll ---------- */
export function RevealOnScroll() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll<HTMLElement>(".fb .reveal").forEach((el, i) => {
      el.style.transitionDelay = (el.closest(".hero") ? i * 0.12 : 0) + "s";
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return null;
}

/* ---------- Story slides ---------- */
type Slide = { src: string; alt: string; caption: string };

export function MissionSlides({ slides }: { slides: Slide[] }) {
  const [idx, setIdx] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length, cycle]);

  return (
    <div className="mission-art">
      <div className="slides photo-slides">
        {slides.map((s, k) => (
          <figure key={s.src} className={`slide${k === idx ? " is-active" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.src} alt={s.alt} loading={k === 0 ? undefined : "lazy"} />
            <figcaption>{s.caption}</figcaption>
          </figure>
        ))}
      </div>
      <div className="dots">
        {slides.map((s, k) => (
          <button
            key={s.src}
            className={k === idx ? "is-active" : undefined}
            aria-label={`Slide ${k + 1}`}
            onClick={() => {
              setIdx(k);
              setCycle((c) => c + 1);
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- How-it-works carousel ---------- */
export type HowStep = {
  c: string;
  strip: string;
  art: string;
  title: string;
  desc: string;
  href: string;
  link: string;
};

const SLIDE_MS = 820;

export function HowCarousel({ steps }: { steps: HowStep[] }) {
  const n = steps.length;
  const [order, setOrder] = useState(() => steps.map((_, i) => i));
  const [shift, setShift] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [cycle, setCycle] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const next = useCallback(() => {
    const track = trackRef.current;
    if (busy.current || !track) return;
    busy.current = true;
    const first = track.children[0] as HTMLElement;
    setShift(first.offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 23));
    setStep((s) => (s + 1) % n);
    setTimeout(() => {
      // park the card that slid out at the end and snap the track back, in one commit
      setOrder((o) => [...o.slice(1), o[0]]);
      setShift(null);
      busy.current = false;
    }, SLIDE_MS);
  }, [n]);

  useEffect(() => {
    const t = setInterval(next, 4200);
    return () => clearInterval(t);
  }, [next, cycle]);

  const active = shift === null ? order[0] : order[1];

  return (
    <div className="how-viewport">
      <div
        className="how-track"
        ref={trackRef}
        style={
          shift === null
            ? { transition: "none", transform: "translateX(0)" }
            : { transition: "transform .8s cubic-bezier(.6,.1,.2,1)", transform: `translateX(${-shift}px)` }
        }
      >
        {order.map((i) => {
          const s = steps[i];
          const isActive = i === active;
          return (
            <article
              key={s.title}
              className={`how-card${isActive ? " is-active" : ""}`}
              style={{ "--c": s.c, "--strip": s.strip } as React.CSSProperties}
              onClick={(e) => {
                if (isActive) return;
                e.preventDefault();
                next();
                setCycle((c) => c + 1);
              }}
            >
              <div className="how-top">
                <span>STEP</span>
                <span>
                  {String(i + 1).padStart(2, "0")}/{String(n).padStart(2, "0")}
                </span>
              </div>
              <div className="how-art" dangerouslySetInnerHTML={{ __html: s.art }} />
              <h3 className="serif-light">{s.title}</h3>
              <p className="how-desc">{s.desc}</p>
              <a href={s.href} className="how-link">
                <span>{s.link}</span> &rarr;
              </a>
            </article>
          );
        })}
      </div>
      <div className="how-progress">
        <span style={{ left: `${(step * 100) / n}%` }} />
      </div>
    </div>
  );
}

/* ---------- Gallery drag-scroll + progress ---------- */
export function MagazineScroller({
  aside,
  children,
}: {
  aside: React.ReactNode;
  children: React.ReactNode;
}) {
  const viewRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mv = viewRef.current;
    const bar = barRef.current;
    if (!mv || !bar) return;

    function progress() {
      if (!mv || !bar) return;
      const max = mv.scrollWidth - mv.clientWidth;
      const ratio = mv.clientWidth / mv.scrollWidth;
      const track = bar.parentElement!.clientWidth;
      const w = Math.max(0.18, Math.min(1, ratio)) * track;
      bar.style.width = w + "px";
      bar.style.left = (max > 0 ? (mv.scrollLeft / max) * (track - w) : 0) + "px";
    }

    let drag: { x: number; s: number; moved: boolean } | null = null;
    let suppressClick = false;
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, s: mv.scrollLeft, moved: false };
      suppressClick = false;
      mv.classList.add("dragging");
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 3) drag.moved = true;
      mv.scrollLeft = drag.s - dx;
    };
    const up = () => {
      suppressClick = !!drag?.moved;
      drag = null;
      mv.classList.remove("dragging");
    };
    const click = (e: MouseEvent) => {
      if (suppressClick) e.preventDefault();
      suppressClick = false;
    };

    mv.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    mv.addEventListener("click", click, true);
    mv.addEventListener("scroll", progress, { passive: true });
    window.addEventListener("resize", progress);
    progress();
    return () => {
      mv.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      mv.removeEventListener("click", click, true);
      mv.removeEventListener("scroll", progress);
      window.removeEventListener("resize", progress);
    };
  }, []);

  return (
    <>
      <div className="mag-grid">
        {aside}
        <div className="mag-viewport" ref={viewRef}>
          <div className="mag-track">{children}</div>
        </div>
      </div>
      <div className="mag-progress">
        <span ref={barRef} />
      </div>
    </>
  );
}
