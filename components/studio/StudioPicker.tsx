"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudioBuilding } from "../../lib/studio";
import { elevationSvg, extents, profileFor } from "../../lib/buildingProfiles";
import { fetchStudioBuildings } from "../../app/studio/actions";
import { ConnectStudioModal } from "../ConnectStudioModal";

type Sort = "height" | "name";

/** px height of the tallest axis value */
const STAGE_H = 420;
/** px of sky above the axis top */
const HEADROOM = 56;
const AXIS_W = 64;
const MIN_COL = 172;

// caption rows, so the left-hand labels line up with every column
const ROWS = [
  { key: "name", label: "Name", h: 58 },
  { key: "place", label: "Place", h: 40 },
  { key: "height", label: "Height", h: 46 },
  { key: "floors", label: "Floors", h: 26 },
  { key: "built", label: "Built", h: 26 },
  { key: "open", label: "", h: 52 },
] as const;

/** a round axis top and a grid step that gives 4–8 lines */
function niceAxis(top: number) {
  const step = [10, 25, 50, 100, 200].find((s) => Math.ceil(top / s) <= 8) ?? 250;
  return { step, max: Math.max(step, Math.ceil((top * 1.04) / step) * step) };
}

export function StudioPicker({
  initialBuildings,
  hasAccess = false,
  email = "",
}: {
  initialBuildings?: StudioBuilding[];
  hasAccess?: boolean;
  email?: string;
}) {
  const router = useRouter();
  const [buildings, setBuildings] = useState<StudioBuilding[]>(initialBuildings || []);
  const [connectModalOpen, setConnectModalOpen] = useState(!hasAccess);
  const [country, setCountry] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("height");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!initialBuildings || initialBuildings.length === 0) {
      fetchStudioBuildings().then((res) => setBuildings(res));
    }
  }, [initialBuildings]);

  const countries = useMemo(() => {
    const map = new Map<string, number>();
    buildings.forEach((b) => map.set(b.country || "Other", (map.get(b.country || "Other") ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [buildings]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = buildings
      .filter((b) => !country || (b.country || "Other") === country)
      .filter((b) => !q || `${b.name} ${b.city_name} ${b.country} ${b.area ?? ""}`.toLowerCase().includes(q))
      .map((b) => {
        const { profile, known } = profileFor(b.slug);
        return { b, profile, known, ext: extents(profile), art: elevationSvg(profile).svg };
      });
    list.sort((x, y) =>
      sort === "name" ? x.b.name.localeCompare(y.b.name) : y.profile.height - x.profile.height || x.b.name.localeCompare(y.b.name)
    );
    return list;
  }, [buildings, country, query, sort]);

  // one scale for the whole lineup, fitted to what's currently shown
  const axis = niceAxis(Math.max(60, ...items.map((i) => i.ext.top)));
  const k = STAGE_H / axis.max;
  const ticks = Array.from({ length: axis.max / axis.step + 1 }, (_, i) => i * axis.step);
  // violet stage with a grid line every axis step, measured up from the ground
  const stageBg = `repeating-linear-gradient(to top, rgba(246,234,234,.16) 0 1px, transparent 1px ${axis.step * k}px), linear-gradient(180deg, var(--stage-a), var(--stage-b))`;

  const open = (b: StudioBuilding) => {
    if (b.available === false) return;
    router.push(`/studio/configure?type=building&city=${b.city_slug}&location=${b.slug}`);
  };

  return (
    <div className="relative w-full pb-20 pt-16 md:pb-28 md:pt-24">
      <ConnectStudioModal isOpen={connectModalOpen} onClose={() => setConnectModalOpen(false)} email={email} />

      {/* heading */}
      <div className="mx-auto mb-10 flex max-w-[1200px] flex-col justify-between gap-6 px-[22px] md:flex-row md:items-end md:px-16">
        <div>
          <div className="fb-eyebrow mb-5">The Studio</div>
          <h1 className="fb-display m-0 text-[clamp(44px,7vw,80px)] text-ink">
            Pick a<br />
            building.
          </h1>
        </div>
        <p className="m-0 max-w-[340px] text-[13.5px] font-light leading-[1.45] text-cream/80 md:text-right">
          Every landmark in the library, drawn side by side at the same scale. Click one to open it in the
          Studio.
        </p>
      </div>

      {/* filters */}
      <div className="mx-auto mb-6 flex max-w-[1200px] flex-wrap items-center gap-3 px-[22px] md:px-16">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by country">
          <Chip on={!country} onClick={() => setCountry(null)} label="All" count={buildings.length} />
          {countries.map(([c, n]) => (
            <Chip key={c} on={country === c} onClick={() => setCountry(country === c ? null : c)} label={c} count={n} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 md:ml-auto">
          <label className="flex h-[38px] items-center gap-2 border border-[var(--line-light)] bg-white px-3">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-[#8a8492]" strokeWidth="1.8" aria-hidden>
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4 4" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search buildings"
              aria-label="Search buildings"
              className="w-[150px] bg-transparent text-[13px] text-ink outline-none placeholder:text-[#a9a6ab]"
            />
          </label>
          <div className="flex gap-[3px] border border-[var(--line-light)] bg-white p-[3px]" role="group" aria-label="Sort">
            {(
              [
                ["height", "Tallest"],
                ["name", "A–Z"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setSort(v)}
                aria-pressed={sort === v}
                className={`h-[30px] px-3.5 font-mono text-[8.5px] uppercase tracking-[0.12em] transition-colors ${
                  sort === v ? "bg-rose text-white" : "text-[#8a8492] hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mx-auto max-w-[1200px] px-[22px] md:px-16">
          <div className="fb-sheet px-8 py-14 text-center">
            <div className="fb-serif-light mb-2 text-[30px] text-ink">
              {buildings.length ? "No buildings match." : "Buildings will be posted."}
            </div>
            <p className="fb-hint m-0">
              {buildings.length ? "Try another country or clear the search." : "No building models are available yet."}
            </p>
          </div>
        </div>
      ) : (
        <Lineup>
          {/* axis + row labels, pinned to the left */}
          <div className="sticky left-0 z-10 shrink-0" style={{ width: AXIS_W }}>
            <div className="relative border-r border-white/15" style={{ height: STAGE_H + HEADROOM, backgroundImage: stageBg }}>
              {ticks.map((t) => (
                <span
                  key={t}
                  className={`absolute right-2.5 font-mono text-[8px] tracking-[0.08em] text-[#f6eaea]/70 ${t === 0 ? "" : "translate-y-1/2"}`}
                  style={{ bottom: t === 0 ? 4 : t * k }}
                >
                  {t === 0 ? "m" : t}
                </span>
              ))}
            </div>
            <div className="h-[5px] bg-[#b9b5c2]" />
            <div className="bg-paper">
              {ROWS.map((r) => (
                <div
                  key={r.key}
                  className="flex items-center justify-end border-b border-[var(--line-light)] pr-2.5 font-mono text-[7.5px] uppercase tracking-[0.14em] text-[#8a8492]"
                  style={{ height: r.h }}
                >
                  {r.label}
                </div>
              ))}
            </div>
          </div>

          {/* buildings */}
          <div className="relative flex flex-1">
            {/* stage and grid lines behind the elevations */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0"
              style={{
                height: STAGE_H + HEADROOM,
                backgroundImage: stageBg,
              }}
            />
            {items.map(({ b, profile, known, ext, art }) => {
              const ready = b.available !== false;
              const colW = Math.max(MIN_COL, ext.width * k + 56);
              return (
                <button
                  key={b.slug}
                  type="button"
                  disabled={!ready}
                  onClick={() => open(b)}
                  data-lineup-col
                  className={`group relative flex shrink-0 flex-col text-left outline-none ${ready ? "cursor-pointer" : "cursor-not-allowed"}`}
                  style={{ width: colW }}
                  title={ready ? `Open ${b.name} in the Studio` : `${b.name} — coming soon`}
                >
                  {/* elevation */}
                  <div className="relative flex w-full items-end justify-center" style={{ height: STAGE_H + HEADROOM }}>
                    <span className="absolute inset-0 transition-colors duration-300 group-hover:bg-white/[0.07] group-focus-visible:bg-white/[0.09]" />
                    <span
                      className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[8px] uppercase tracking-[0.14em] text-[#f6eaea] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                      style={{ bottom: ext.top * k + 10 }}
                    >
                      {known ? `${profile.height} m` : "Height n/a"}
                    </span>
                    <div
                      className={`relative transition-[color,transform] duration-300 [&_svg]:block [&_svg]:h-full [&_svg]:w-full ${
                        ready
                          ? "text-[#f6eaea] group-hover:-translate-y-1 group-hover:text-[#f29bb7] group-focus-visible:text-[#f29bb7]"
                          : "text-[#f6eaea]/35"
                      } ${known ? "" : "opacity-70"}`}
                      style={{ width: ext.width * k, height: ext.top * k }}
                      dangerouslySetInnerHTML={{ __html: art }}
                    />
                  </div>

                  {/* ground line: rose = ready to print, grey = coming soon */}
                  <div className={`h-[5px] w-full ${ready ? "bg-rose" : "bg-[#b9b5c2]"}`} />

                  {/* caption table */}
                  <div className="w-full bg-paper transition-colors duration-300 group-hover:bg-white">
                    <Cell h={ROWS[0].h}>
                      <span className="line-clamp-2 font-display text-[19px] leading-[1.12] text-ink">{b.name}</span>
                    </Cell>
                    <Cell h={ROWS[1].h}>
                      <span className="line-clamp-2 text-[11.5px] leading-[1.3] text-[#5d5758]">
                        {b.city_name}
                        <br />
                        <span className="text-[#8a8492]">{b.country}</span>
                      </span>
                    </Cell>
                    <Cell h={ROWS[2].h}>
                      <span className="fb-display text-[24px] text-ink">
                        {known ? profile.height : "—"}
                        {known && (
                          <small className="ml-1 font-display text-[13px] font-light tracking-normal text-[#5d5758]">m</small>
                        )}
                      </span>
                    </Cell>
                    <Cell h={ROWS[3].h}>
                      <span className="text-[12px] text-[#5d5758]">{known && profile.floors ? profile.floors : "—"}</span>
                    </Cell>
                    <Cell h={ROWS[4].h}>
                      <span className="text-[12px] text-[#5d5758]">{known && profile.year ? profile.year : "—"}</span>
                    </Cell>
                    <Cell h={ROWS[5].h}>
                      {ready ? (
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-rose-ink transition-[gap] duration-300 group-hover:gap-3">
                          Open in Studio <span aria-hidden>&rarr;</span>
                        </span>
                      ) : (
                        <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#8a8492]">Coming soon</span>
                      )}
                    </Cell>
                  </div>
                </button>
              );
            })}
          </div>
        </Lineup>
      )}

      {/* legend */}
      {items.length > 0 && (
        <div className="mx-auto mt-5 flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-[22px] md:px-16">
          <span className="fb-hint m-0 flex items-center gap-2">
            <i className="inline-block h-[5px] w-6 bg-rose" /> Ready to print
          </span>
          <span className="fb-hint m-0 flex items-center gap-2">
            <i className="inline-block h-[5px] w-6 bg-[#b9b5c2]" /> Coming soon
          </span>
          <span className="fb-hint m-0 sm:ml-auto">
            {items.length} building{items.length === 1 ? "" : "s"} · drawn to scale · drag or use the arrows to scroll
          </span>
        </div>
      )}
    </div>
  );
}

function Chip({ on, onClick, label, count }: { on: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex h-[38px] items-center gap-2 border px-4 font-mono text-[8.5px] uppercase tracking-[0.14em] transition-colors ${
        on ? "border-rose bg-rose text-white" : "border-[var(--line-light)] bg-white text-ink hover:border-ink"
      }`}
    >
      {label}
      <span className={on ? "text-white/75" : "text-[#8a8492]"}>{count}</span>
    </button>
  );
}

function Cell({ h, children }: { h: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center border-b border-[var(--line-light)] px-4" style={{ height: h }}>
      {children}
    </div>
  );
}

/** Horizontal scroller with drag-to-scroll, arrow buttons and a progress bar. */
function Lineup({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = ref.current;
    const bar = barRef.current;
    if (!el || !bar) return;

    function sync() {
      if (!el || !bar) return;
      const max = el.scrollWidth - el.clientWidth;
      const track = bar.parentElement!.clientWidth;
      const w = Math.max(0.12, Math.min(1, el.clientWidth / el.scrollWidth)) * track;
      bar.style.width = w + "px";
      bar.style.left = (max > 0 ? (el.scrollLeft / max) * (track - w) : 0) + "px";
      setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft >= max - 2 });
    }

    let drag: { x: number; s: number; moved: boolean } | null = null;
    let suppress = false;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      drag = { x: e.clientX, s: el.scrollLeft, moved: false };
      suppress = false;
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) {
        drag.moved = true;
        el.classList.add("cursor-grabbing");
      }
      if (drag.moved) el.scrollLeft = drag.s - dx;
    };
    const up = () => {
      suppress = !!drag?.moved;
      drag = null;
      el.classList.remove("cursor-grabbing");
    };
    const click = (e: MouseEvent) => {
      if (suppress) {
        e.preventDefault();
        e.stopPropagation();
      }
      suppress = false;
    };

    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    el.addEventListener("click", click, true);
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    const ro = new ResizeObserver(sync);
    ro.observe(el.firstElementChild as Element);
    sync();
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("click", click, true);
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      ro.disconnect();
    };
  }, []);

  const step = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const col = el.querySelector<HTMLElement>("[data-lineup-col]");
    el.scrollBy({ left: dir * Math.max(240, (col?.offsetWidth ?? 200) * 2), behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-[1200px] px-[22px] md:px-16">
      <div className="relative">
        <div
          ref={ref}
          className="overflow-x-auto overscroll-x-contain border border-[var(--line-light)] bg-paper shadow-[0_18px_40px_rgba(30,25,80,0.16)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex w-max min-w-full">{children}</div>
        </div>
        {(["prev", "next"] as const).map((d) => {
          const hidden = d === "prev" ? edges.start : edges.end;
          return (
            <button
              key={d}
              type="button"
              aria-label={d === "prev" ? "Scroll left" : "Scroll right"}
              onClick={() => step(d === "prev" ? -1 : 1)}
              className={`absolute top-[200px] z-20 grid h-10 w-10 place-items-center bg-rose text-[18px] text-white shadow-[0_8px_18px_rgba(30,25,80,0.25)] transition-[opacity,background-color] duration-300 hover:bg-[#cf6c86] ${
                d === "prev" ? "left-[76px]" : "right-3"
              } ${hidden ? "pointer-events-none opacity-0" : "opacity-100"}`}
            >
              {d === "prev" ? "←" : "→"}
            </button>
          );
        })}
      </div>
      <div className="relative mt-4 h-[3px] bg-[#ececf2]">
        <span ref={barRef} className="absolute inset-y-0 left-0 bg-[#c0c0e6]" />
      </div>
    </div>
  );
}
