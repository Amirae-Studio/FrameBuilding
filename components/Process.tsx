"use client";

import { heritageSteps } from "../lib/data";
import { Reveal } from "./Reveal";

export function Process() {
  return (
    <section id="process" className="px-5 py-20 md:px-12 md:py-28">
      <div className="mx-auto max-w-[1100px]">
        <Reveal className="mb-14 max-w-[620px]">
          <div
            className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.32em]"
            style={{ color: "var(--accent-text)" }}
          >
            The process
          </div>
          <h2 className="m-0 font-display text-[clamp(32px,4.4vw,56px)] font-semibold leading-[1.04] tracking-[-0.02em]">
            From archive to{" "}
            <span className="sunset-text">your shelf</span>.
          </h2>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-3">
          {heritageSteps.map((s, i) => (
            <Reveal key={s.no} delay={i * 0.1}>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-cream/[0.1] bg-panel p-7 transition-all duration-500 hover:-translate-y-1 hover:border-cream/25">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-40"
                  style={{ background: "var(--accent)" }}
                />
                <div className="relative">
                  <div className="mb-10 font-mono text-[12px] tracking-[0.2em] text-cream/40">
                    {s.no}
                  </div>
                  <h3 className="m-0 mb-3 font-display text-[22px] font-semibold tracking-[-0.01em]">
                    {s.title}
                  </h3>
                  <p className="m-0 text-[14.5px] leading-[1.75] text-cream/60">
                    {s.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
