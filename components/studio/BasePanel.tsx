"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import Scrubber from "../ui/Scrubber";
import SegmentedToggle from "../ui/Switch";
import {
  BASE_LIMITS,
  makeBase,
  makeText,
  type BaseFace,
  type BaseLayer,
  type BaseText,
  type CityControls,
} from "../../lib/studio";

type SetCtl = (fn: (c: CityControls) => CityControls) => void;

const FACES: { id: BaseFace; label: string }[] = [
  { id: "top", label: "Top" },
  { id: "front", label: "Front" },
  { id: "back", label: "Back" },
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
];

const TEXT_PRESETS = ["#FFFFFF", "#000000", "#C12E1F", "#0086D6", "#3F8E43", "#FEC600", "#FF6A13", "#5E43B7"];

const chip = (on: boolean) =>
  `rounded-md py-1.5 text-center font-mono text-[9.5px] font-bold uppercase tracking-wider transition-colors ${
    on
      ? "bg-cream text-[var(--color-base)] shadow-sm"
      : "border border-cream/[0.12] bg-cream/[0.04] text-cream/70 hover:bg-cream/[0.1] hover:text-cream"
  }`;

const iconBtn =
  "flex h-7 w-7 items-center justify-center rounded-md text-cream/50 transition-colors hover:bg-cream/10 hover:text-cream disabled:pointer-events-none disabled:opacity-25";

/**
 * Base tab: a stack of plates (each sized, thickened and rounded on its own)
 * and any number of labels placed on any face of any plate.
 */
export function BaseTab({
  ctl,
  setCtl,
  selectedBaseId,
  setSelectedBaseId,
  selectedTextId,
  setSelectedTextId,
  defaultLabel,
}: {
  ctl: CityControls;
  setCtl: SetCtl;
  selectedBaseId: string | null;
  setSelectedBaseId: (id: string | null) => void;
  selectedTextId: string | null;
  setSelectedTextId: (id: string | null) => void;
  defaultLabel: string;
}) {
  const bases = ctl.bases;
  const texts = ctl.texts;
  const selBase = bases.find((b) => b.id === selectedBaseId) ?? null;
  const selText = texts.find((t) => t.id === selectedTextId) ?? null;

  const patchBase = (id: string, p: Partial<BaseLayer>) =>
    setCtl((c) => ({ ...c, bases: c.bases.map((b) => (b.id === id ? { ...b, ...p } : b)) }));
  const patchText = (id: string, p: Partial<BaseText>) =>
    setCtl((c) => ({ ...c, texts: c.texts.map((t) => (t.id === id ? { ...t, ...p } : t)) }));

  const addBase = () => {
    if (bases.length >= BASE_LIMITS.maxBases) return;
    const b = makeBase(bases.length);
    setCtl((c) => ({ ...c, bases: [...c.bases, b] }));
    setSelectedBaseId(b.id);
  };
  const removeBase = (id: string) => {
    if (bases.length <= 1) return;
    const keep = bases.filter((b) => b.id !== id);
    // labels on a removed base move to the top base
    setCtl((c) => ({
      ...c,
      bases: keep,
      texts: c.texts.map((t) => (t.baseId === id ? { ...t, baseId: keep[0].id } : t)),
    }));
    if (selectedBaseId === id) setSelectedBaseId(null);
  };
  const moveBase = (id: string, dir: -1 | 1) =>
    setCtl((c) => {
      const i = c.bases.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= c.bases.length) return c;
      const next = c.bases.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return { ...c, bases: next };
    });

  const addText = () => {
    if (texts.length >= BASE_LIMITS.maxTexts) return;
    const target = selBase ?? bases[0];
    if (!target) return;
    // the first label goes on the front strip of the top; later ones on the front side
    const t = makeText(target.id, texts.length === 0 ? {} : { text: "Text", face: "front", v: 0 });
    setCtl((c) => ({ ...c, texts: [...c.texts, t] }));
    setSelectedTextId(t.id);
  };
  const removeText = (id: string) => {
    setCtl((c) => ({ ...c, texts: c.texts.filter((t) => t.id !== id) }));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <SegmentedToggle
        label="Base under the model"
        checked={ctl.enableRevit}
        onCheckedChange={(v) => setCtl((c) => ({ ...c, enableRevit: v }))}
      />

      {ctl.enableRevit && (
        <>
          {/* ── bases ───────────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cream/45">
                Bases · top to bottom
              </span>
              <button
                type="button"
                onClick={addBase}
                disabled={bases.length >= BASE_LIMITS.maxBases}
                className="flex items-center gap-1 rounded-md border border-[var(--accent)]/40 px-2 py-1 font-mono text-[9.5px] font-bold uppercase tracking-wider text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10 disabled:opacity-30"
              >
                <Plus size={12} /> Add base
              </button>
            </div>

            {bases.map((b, i) => {
              const open = b.id === selectedBaseId;
              const m = b.uniform ? `${b.margin.toFixed(1)} cm` : `${b.marginW.toFixed(1)} × ${b.marginD.toFixed(1)} cm`;
              return (
                <div
                  key={b.id}
                  className={`rounded-xl border transition-colors ${
                    open ? "border-[var(--accent)]/50 bg-cream/[0.05]" : "border-cream/[0.12] bg-cream/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-2 px-2.5 py-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBaseId(open ? null : b.id)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    >
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-[4px] border border-cream/30"
                        style={{ background: b.color }}
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-[12.5px] font-medium text-cream">
                          Base {i + 1}
                          {i === 0 && <span className="ml-1.5 font-mono text-[9px] uppercase text-cream/40">top</span>}
                        </span>
                        <span className="truncate font-mono text-[9.5px] text-cream/45">
                          {(b.thickness * 10).toFixed(0)} mm thick · +{m} · {b.roundness}% round
                        </span>
                      </span>
                    </button>
                    <button type="button" title="Move up" className={iconBtn} disabled={i === 0} onClick={() => moveBase(b.id, -1)}>
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      title="Move down"
                      className={iconBtn}
                      disabled={i === bases.length - 1}
                      onClick={() => moveBase(b.id, 1)}
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      title="Remove base"
                      className={iconBtn}
                      disabled={bases.length <= 1}
                      onClick={() => removeBase(b.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-3 border-t border-cream/[0.09] px-3 pb-3 pt-3">
                          <Scrubber
                            label={`Thickness: ${(b.thickness * 10).toFixed(0)} mm`}
                            value={Math.round(b.thickness * 10)}
                            min={BASE_LIMITS.thicknessCm[0] * 10}
                            max={BASE_LIMITS.thicknessCm[1] * 10}
                            step={1}
                            decimals={0}
                            onValueChange={(v) => patchBase(b.id, { thickness: v / 10 })}
                          />
                          <SegmentedToggle
                            label="Same length & width margin"
                            checked={b.uniform}
                            onCheckedChange={(v) =>
                              patchBase(b.id, v ? { uniform: true } : { uniform: false, marginW: b.margin, marginD: b.margin })
                            }
                          />
                          {b.uniform ? (
                            <Scrubber
                              label={`Margin each side: ${b.margin.toFixed(1)} cm`}
                              value={Math.round(b.margin * 10)}
                              min={0}
                              max={BASE_LIMITS.marginCm[1] * 10}
                              step={1}
                              decimals={0}
                              onValueChange={(v) => patchBase(b.id, { margin: v / 10 })}
                            />
                          ) : (
                            <>
                              <Scrubber
                                label={`Length margin: ${b.marginW.toFixed(1)} cm / side`}
                                value={Math.round(b.marginW * 10)}
                                min={0}
                                max={BASE_LIMITS.marginCm[1] * 10}
                                step={1}
                                decimals={0}
                                onValueChange={(v) => patchBase(b.id, { marginW: v / 10 })}
                              />
                              <Scrubber
                                label={`Width margin: ${b.marginD.toFixed(1)} cm / side`}
                                value={Math.round(b.marginD * 10)}
                                min={0}
                                max={BASE_LIMITS.marginCm[1] * 10}
                                step={1}
                                decimals={0}
                                onValueChange={(v) => patchBase(b.id, { marginD: v / 10 })}
                              />
                            </>
                          )}
                          <Scrubber
                            label={`Roundness: ${b.roundness}%`}
                            value={b.roundness}
                            min={0}
                            max={100}
                            step={1}
                            decimals={0}
                            onValueChange={(v) => patchBase(b.id, { roundness: v })}
                          />
                          <p className="m-0 font-mono text-[9px] leading-[1.5] text-cream/35">
                            Colour is set in Filament Colors. Bases always touch — no gaps.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* ── texts ───────────────────────────────────────────── */}
          <div className="flex flex-col gap-2 border-t border-cream/[0.09] pt-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cream/45">Texts</span>
              <button
                type="button"
                onClick={addText}
                disabled={texts.length >= BASE_LIMITS.maxTexts}
                className="flex items-center gap-1 rounded-md border border-[var(--accent)]/40 px-2 py-1 font-mono text-[9.5px] font-bold uppercase tracking-wider text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10 disabled:opacity-30"
              >
                <Plus size={12} /> Add text
              </button>
            </div>

            {texts.length === 0 ? (
              <p className="m-0 font-mono text-[9.5px] leading-[1.6] text-cream/35">No text yet — add one to label your base.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {texts.map((t, i) => {
                  const on = t.id === selectedTextId;
                  const label = (t.text.trim() || defaultLabel).split("\n")[0];
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTextId(on ? null : t.id)}
                      className={`flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] transition-colors ${
                        on
                          ? "bg-cream text-[var(--color-base)] font-semibold"
                          : "border border-cream/[0.12] bg-cream/[0.04] text-cream/75 hover:bg-cream/[0.1]"
                      }`}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/20" style={{ background: t.color }} />
                      <span className="truncate">{label || `Text ${i + 1}`}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {selText && (
              <TextEditor
                key={selText.id}
                t={selText}
                bases={bases}
                defaultLabel={defaultLabel}
                onPatch={(p) => patchText(selText.id, p)}
                onRemove={() => removeText(selText.id)}
              />
            )}
            {texts.length > 0 && (
              <p className="m-0 font-mono text-[9px] leading-[1.6] uppercase tracking-[0.12em] text-cream/30">
                Drag a text on the model — across the top or onto any side of any base
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TextEditor({
  t,
  bases,
  defaultLabel,
  onPatch,
  onRemove,
}: {
  t: BaseText;
  bases: BaseLayer[];
  defaultLabel: string;
  onPatch: (p: Partial<BaseText>) => void;
  onRemove: () => void;
}) {
  const baseIndex = Math.max(0, bases.findIndex((b) => b.id === t.baseId));
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--accent)]/40 bg-cream/[0.04] p-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cream/60">Edit text</span>
        <button type="button" title="Delete text" className={iconBtn} onClick={onRemove}>
          <Trash2 size={13} />
        </button>
      </div>

      <textarea
        rows={2}
        placeholder={defaultLabel}
        value={t.text}
        onChange={(e) => onPatch({ text: e.target.value })}
        className="w-full resize-none rounded-lg border border-cream/[0.16] bg-cream/[0.04] px-3 py-2 font-mono text-[11px] text-cream placeholder:text-cream/25 outline-none focus:border-[var(--accent)]/60"
      />

      <FontSelect value={t.font} onChange={(f) => onPatch({ font: f })} />

      <Scrubber
        label={`Size: ${t.size} mm`}
        value={t.size}
        min={BASE_LIMITS.textSizeMm[0]}
        max={BASE_LIMITS.textSizeMm[1]}
        step={1}
        decimals={0}
        onValueChange={(v) => onPatch({ size: v })}
      />

      <div className="grid grid-cols-2 gap-1 rounded-lg border border-cream/[0.12] p-1">
        {(
          [
            ["emboss", "Raised"],
            ["engrave", "Engraved"],
          ] as const
        ).map(([m, label]) => (
          <button key={m} type="button" onClick={() => onPatch({ mode: m })} className={chip(t.mode === m)}>
            {label}
          </button>
        ))}
      </div>

      <Scrubber
        label={`${t.mode === "engrave" ? "Cut depth" : "Height"}: ${t.depth.toFixed(1)} mm`}
        value={Math.round(t.depth * 10)}
        min={BASE_LIMITS.textDepthMm[0] * 10}
        max={BASE_LIMITS.textDepthMm[1] * 10}
        step={1}
        decimals={0}
        onValueChange={(v) => onPatch({ depth: v / 10 })}
      />

      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cream/45">Colour</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={t.color}
            onChange={(e) => onPatch({ color: e.target.value })}
            className="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-cream/[0.2] bg-transparent"
          />
          <div className="grid flex-1 grid-cols-8 gap-1">
            {TEXT_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                title={p}
                onClick={() => onPatch({ color: p })}
                className={`h-6 w-full rounded-md border transition-transform hover:scale-110 ${
                  t.color.toLowerCase() === p.toLowerCase()
                    ? "ring-2 ring-cream ring-offset-1 ring-offset-[var(--color-panel)]"
                    : "border-cream/20"
                }`}
                style={{ backgroundColor: p }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-cream/[0.12] bg-cream/[0.03] p-2.5">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cream/55">Position</span>
        {bases.length > 1 && (
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(bases.length, 6)}, 1fr)` }}>
            {bases.map((b, i) => (
              <button key={b.id} type="button" onClick={() => onPatch({ baseId: b.id })} className={chip(i === baseIndex)}>
                Base {i + 1}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-5 gap-1">
          {FACES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onPatch({ face: f.id, u: 0, v: f.id === "top" ? -93 : 0 })}
              className={chip(t.face === f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Scrubber
          label={`Along: ${t.u > 0 ? "+" : ""}${t.u}%`}
          value={t.u + 100}
          min={0}
          max={200}
          step={1}
          decimals={0}
          onValueChange={(v) => onPatch({ u: v - 100 })}
        />
        <Scrubber
          label={`${t.face === "top" ? "Front ↔ back" : "Up ↔ down"}: ${t.v > 0 ? "+" : ""}${t.v}%`}
          value={t.v + 100}
          min={0}
          max={200}
          step={1}
          decimals={0}
          onValueChange={(v) => onPatch({ v: v - 100 })}
        />
        <Scrubber
          label={`Rotation: ${t.rotation}°`}
          value={t.rotation + 180}
          min={0}
          max={360}
          step={5}
          decimals={0}
          onValueChange={(v) => onPatch({ rotation: v - 180 })}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ font picker */

export const FONT_OPTIONS = [
  { id: "italic", label: "Italic", sub: "16° Slanted", preview: "ABC Italic", isItalic: true },
  { id: "boldItalic", label: "Bold Italic", sub: "Bold & 16° Slant", preview: "ABC Bold Italic", isItalic: true, isBold: true },
  { id: "bold", label: "Bold", sub: "Heavy weight", preview: "ABC Bold", isBold: true },
  { id: "sans-serif", label: "Sans-Serif", sub: "Clean Regular", preview: "ABC Regular" },
  { id: "serif", label: "Serif", sub: "Classical Roman", preview: "ABC Serif", isSerif: true },
  { id: "serifBold", label: "Serif Bold", sub: "Heavy Classical", preview: "ABC Serif Bold", isSerif: true, isBold: true },
  { id: "monospace", label: "Monospace", sub: "Typewriter / Code", preview: "ABC Mono", isMono: true },
  { id: "display", label: "Display", sub: "Optimer Modern", preview: "ABC Display" },
  { id: "scriptBold", label: "Script Slanted", sub: "Calligraphic", preview: "ABC Script", isItalic: true, isSerif: true },
];

export function FontSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = FONT_OPTIONS.find((f) => f.id === value) || FONT_OPTIONS[3];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const style = (f: (typeof FONT_OPTIONS)[number]) =>
    `${f.isItalic ? "italic" : ""} ${f.isBold ? "font-bold" : ""} ${f.isMono ? "font-mono" : ""} ${f.isSerif ? "font-serif" : ""}`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-colors duration-200"
        style={{
          borderColor: open ? "var(--accent)" : "rgba(var(--ink-rgb), 0.16)",
          background: open ? "rgba(var(--ink-rgb), 0.06)" : "rgba(var(--ink-rgb), 0.03)",
        }}
      >
        <span className={`text-[12.5px] text-cream ${style(current)} ${current.isBold ? "" : "font-medium"}`}>{current.label}</span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-cream/45">{current.sub}</span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-[10px] text-cream/50" aria-hidden>
            ▾
          </motion.span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-[260px] overflow-y-auto rounded-xl border border-cream/[0.16] bg-panel/98 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl"
          >
            {FONT_OPTIONS.map((f) => {
              const on = f.id === value;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    onChange(f.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors duration-150 ${
                    on ? "bg-cream/[0.1] font-bold text-cream" : "text-cream/75 hover:bg-cream/[0.06] hover:text-cream"
                  }`}
                >
                  <span className={`text-[12.5px] ${style(f)}`} style={{ color: on ? "var(--accent)" : undefined }}>
                    {f.label}
                  </span>
                  <span className="font-mono text-[9px] text-cream/40">{f.sub}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
