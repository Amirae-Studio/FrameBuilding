"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { StudioBuilding } from "../../lib/studio";
import { fetchStudioBuildings } from "../../app/studio/actions";
import { SpotlightCard } from "../ui/SpotlightCard";
import { StepTimeline } from "../ui/StepLine";
import { ConnectStudioModal } from "../ConnectStudioModal";

const ease = [0.22, 1, 0.36, 1] as const;

const STEPS = ["Country", "Building"];

/** Tiny pediment-and-columns glyph used on cards. */
function Glyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 34" className={className} fill="none" aria-hidden>
      <path d="M20 3 37 14H3L20 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 18v12M16 18v12M24 18v12M32 18v12M4 31h32" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Heading({
  eyebrow,
  title,
  accent,
  children,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-11">
      <div
        className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.3em]"
        style={{ color: "var(--accent-text)" }}
      >
        {eyebrow}
      </div>
      <h1 className="m-0 mb-3 font-display text-[clamp(34px,5vw,58px)] font-semibold leading-[1.02] tracking-[-0.025em]">
        {title} {accent && <span className="sunset-text">{accent}</span>}
      </h1>
      {children && (
        <p className="m-0 max-w-[500px] text-[15px] leading-[1.7] text-cream/[0.62]">
          {children}
        </p>
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-cream/[0.12] bg-panel/60 p-12 text-center">
      <Glyph className="mx-auto mb-5 h-9 w-9 text-cream/40" />
      <div className="mb-2 font-display text-[24px] font-semibold text-cream/90">
        {title}
      </div>
      <p className="mx-auto max-w-[420px] text-[14px] leading-[1.6] text-cream/50">
        {body}
      </p>
    </div>
  );
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
  const [buildings, setBuildings] = useState<StudioBuilding[]>(
    initialBuildings || []
  );

  // Auto-open connect access modal if user has not unlocked studio access yet
  const [connectModalOpen, setConnectModalOpen] = useState(!hasAccess);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  useEffect(() => {
    if (!initialBuildings || initialBuildings.length === 0) {
      fetchStudioBuildings().then((res) => setBuildings(res));
    }
  }, [initialBuildings]);

  // Group buildings by country
  const countries = useMemo(() => {
    const map = new Map<string, StudioBuilding[]>();
    buildings.forEach((b) => {
      const name = b.country || "Other";
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(b);
    });
    return Array.from(map.entries()).map(([country, list]) => {
      const ready = list.filter((b) => b.available).length;
      return { country, buildings: list, ready, isAvailable: ready > 0 };
    });
  }, [buildings]);

  const countryBuildings = useMemo(() => {
    if (!selectedCountry) return [];
    return buildings.filter((b) => b.country === selectedCountry);
  }, [buildings, selectedCountry]);

  const currentStepNum = selectedCountry ? 2 : 1;

  return (
    <div className="relative mx-auto w-full max-w-[1040px] px-6 py-14 md:py-20">
      {/* dusk glow behind the heading */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full blur-[130px]"
        style={{
          background:
            "radial-gradient(closest-side, var(--dusk-pink), var(--accent) 55%, transparent)",
          opacity: 0.16,
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.12, 0.2, 0.12] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <ConnectStudioModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        email={email}
      />

      <AnimatePresence mode="wait">
        {!selectedCountry ? (
          /* ------------------------------ STEP 1 · COUNTRY */
          <motion.div
            key="step-countries"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.4, ease }}
          >
            <StepTimeline steps={STEPS} currentStep={currentStepNum} />
            <Heading
              eyebrow="The Studio"
              title="Start with a"
              accent="country."
            >
              Select a country to browse available heritage landmark models.
            </Heading>

            {countries.length === 0 ? (
              <EmptyState
                title="Buildings will be posted."
                body="No building models are currently available in the database."
              />
            ) : (
              <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {countries.map((c) => (
                  <SpotlightCard
                    key={c.country}
                    className={`p-6 transition-all duration-300 ${
                      c.isAvailable
                        ? "cursor-pointer"
                        : "cursor-not-allowed opacity-40 grayscale"
                    }`}
                    disabled={!c.isAvailable}
                    onClick={() => {
                      if (c.isAvailable) setSelectedCountry(c.country);
                    }}
                  >
                    <Glyph className="mb-7 h-7 w-7 text-cream/35 transition-colors duration-300 group-hover:text-[var(--accent)]" />
                    <div className="font-display text-[22px] font-semibold tracking-[-0.01em]">
                      {c.country}
                    </div>
                    {c.isAvailable ? (
                      <div className="mt-2 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.16em] text-cream/45">
                        <span>
                          {c.ready} building{c.ready === 1 ? "" : "s"}
                        </span>
                        <span
                          className="inline-block transition-transform duration-300 group-hover:translate-x-1"
                          style={{ color: "var(--accent)" }}
                          aria-hidden
                        >
                          →
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-cream/50">
                        coming soon
                      </div>
                    )}
                  </SpotlightCard>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          /* ------------------------------ STEP 2 · BUILDING */
          <motion.div
            key="step-buildings"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.4, ease }}
          >
            <button
              onClick={() => setSelectedCountry(null)}
              className="mb-7 flex cursor-pointer items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-cream/50 transition-colors hover:text-cream"
            >
              <span aria-hidden>←</span> All countries
            </button>

            <StepTimeline steps={STEPS} currentStep={currentStepNum} />
            <Heading
              eyebrow={selectedCountry}
              title="Select a"
              accent="building."
            >
              Choose a landmark in {selectedCountry} to view and configure in 3D.
            </Heading>

            <div className="grid grid-cols-1 gap-[14px] md:grid-cols-2">
              {countryBuildings.map((b) => {
                const isReady = b.available !== false;
                return (
                  <SpotlightCard
                    key={b.slug}
                    className={`flex items-center justify-between gap-4 px-6 py-5 transition-all duration-300 ${
                      isReady
                        ? "cursor-pointer"
                        : "cursor-not-allowed opacity-40 grayscale"
                    }`}
                    disabled={!isReady}
                    onClick={() => {
                      if (isReady) {
                        router.push(
                          `/studio/configure?type=building&city=${b.city_slug}&location=${b.slug}`
                        );
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <Glyph className="h-7 w-7 shrink-0 text-cream/35 transition-colors duration-300 group-hover:text-[var(--accent)]" />
                      <div>
                        <div
                          className={`font-display text-[20px] font-semibold tracking-[-0.01em] ${
                            isReady ? "" : "text-cream/70"
                          }`}
                        >
                          {b.name}
                        </div>
                        <div className="mt-0.5 text-[12.5px] text-cream/55">
                          {b.city_name}
                          {b.area ? ` · ${b.area}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {b.coords && (
                        <span className="hidden font-mono text-[10px] text-cream/35 sm:inline">
                          {b.coords}
                        </span>
                      )}
                      {isReady ? (
                        <span
                          className="inline-block transition-transform duration-300 group-hover:translate-x-1"
                          style={{ color: "var(--accent)" }}
                          aria-hidden
                        >
                          →
                        </span>
                      ) : (
                        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-cream/50">
                          soon
                        </span>
                      )}
                    </div>
                  </SpotlightCard>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
