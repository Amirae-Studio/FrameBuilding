"use client";

import Link from "next/link";
import { Oswald } from "next/font/google";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  CaveSunset,
  ForeLayer,
  SCENE_CENTERS,
  SkyLayer,
  WORLD_H,
  WORLD_W,
  WorldDefs,
  WorldLayer,
} from "./art";
import { SmoothScroll } from "./SmoothScroll";

/** condensed display face for the hero wordmark, as in the reference */
const wordmarkFont = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"], display: "swap" });

const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const EASE = [0.16, 1, 0.3, 1] as const;

/** Parallax depth of each layer (1 = moves with the world). */
const DEPTH = { sky: 0.6, cave: 0.62, fore: 1.35 } as const;

/** world y of the bottom of the hero street — must always be in frame */
const HERO_FLOOR = 1016;
/** world units one scene spans — on desktop each scene fills the screen */
const SCENE_H = 1000;
/** on phones fit a little more height so the art isn't cropped to a sliver */
const SCENE_H_NARROW = 1250;

/* ------------------------------------------------------------------ panels */

/** Visibility (0‥1) of the panel we're inside — drives staggered children. */
const PanelT = createContext<MotionValue<number> | null>(null);

/** A text panel that fades in/out as the world scrolls past its scene. */
function Panel({
  progress,
  at,
  unitsPerP,
  className = "",
  holdAfter = false,
  holdBefore = false,
  children,
}: {
  progress: MotionValue<number>;
  /** scroll progress (0‥1) at which this scene is centred */
  at: number;
  /** world units travelled per 1.0 of progress */
  unitsPerP: number;
  className?: string;
  holdAfter?: boolean;
  holdBefore?: boolean;
  children: React.ReactNode;
}) {
  const t = useMotionValue(0);
  const dir = useMotionValue(1);

  const update = useCallback(
    (v: number) => {
      const signed = (v - at) * unitsPerP;
      let d = Math.abs(signed);
      if (holdAfter && signed > 0) d = 0;
      if (holdBefore && signed < 0) d = 0;
      t.set(clamp(1 - (d - 150) / 300));
      dir.set(signed < 0 ? 1 : -1);
    },
    [at, unitsPerP, holdAfter, holdBefore, t, dir]
  );

  useMotionValueEvent(progress, "change", update);
  useEffect(() => update(progress.get()), [update, progress]);

  // the frame appears quickly; children then stagger in on top of it
  const opacity = useTransform(t, (v) => clamp(v * 3));
  const y = useTransform(() => (1 - t.get()) * 30 * dir.get());
  const pointer = useTransform(t, (o) => (o > 0.5 ? "auto" : "none"));

  return (
    <PanelT.Provider value={t}>
      <motion.div
        style={{ opacity, y, pointerEvents: pointer }}
        className={`absolute ${className}`}
      >
        {children}
      </motion.div>
    </PanelT.Provider>
  );
}

/**
 * One staggered line inside a Panel. `mask` slides the content up from
 * behind a clip edge (for headings); otherwise it rises and fades.
 */
function Item({
  i = 0,
  mask = false,
  as = "div",
  className = "",
  children,
}: {
  i?: number;
  mask?: boolean;
  as?: "div" | "li";
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = useContext(PanelT);
  const fallback = useMotionValue(1);
  const t = ctx ?? fallback;
  const local = useTransform(t, (v) => easeOut(clamp((v - i * 0.085) / 0.5)));
  const opacity = useTransform(local, (l) => (mask ? clamp(l * 1.6) : l));
  const y = useTransform(local, (l) => (mask ? `${(1 - l) * 105}%` : `${(1 - l) * 22}px`));

  if (mask) {
    return (
      <div className={`overflow-hidden pb-[0.12em] ${className}`}>
        <motion.div style={{ y, opacity }}>{children}</motion.div>
      </div>
    );
  }
  const Tag = as === "li" ? motion.li : motion.div;
  return (
    <Tag style={{ y, opacity }} className={className}>
      {children}
    </Tag>
  );
}

/** Hairline under a section heading — draws in from the left. */
function Rule() {
  const ctx = useContext(PanelT);
  const fallback = useMotionValue(1);
  const t = ctx ?? fallback;
  const scaleX = useTransform(t, (v) => easeOut(clamp((v - 0.1) / 0.6)));
  return (
    <motion.div
      aria-hidden
      className="mb-7 h-px w-[min(260px,62%)] origin-left bg-white/35"
      style={{ scaleX }}
    />
  );
}

/** Hero wordmark — letters rise out of a blur one after another on load. */
function IntroWordmark({ text, still }: { text: string; still: boolean }) {
  return (
    <h1
      aria-label={text}
      className={`${wordmarkFont.className} m-0 flex pl-[0.42em] text-[clamp(36px,6.8vw,112px)] font-bold uppercase leading-none tracking-[0.42em] drop-shadow-[0_4px_24px_rgba(60,20,90,0.35)]`}
    >
      {text.split("").map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block"
          initial={still ? false : { opacity: 0, y: "0.55em", filter: "blur(14px)" }}
          animate={{ opacity: 1, y: "0em", filter: "blur(0px)" }}
          transition={{ duration: 1.1, delay: 0.35 + i * 0.075, ease: EASE }}
        >
          {ch}
        </motion.span>
      ))}
    </h1>
  );
}

const textCard =
  "hb-card relative w-[min(500px,calc(100vw-40px))] text-white md:w-[min(37vw,540px)] max-md:rounded-2xl max-md:border max-md:border-white/10 max-md:bg-[#0d0a22]/70 max-md:p-6 max-md:backdrop-blur-xl";

/* type scale of the reference: heavy tight headings, near-white body copy */
const h2Cls =
  "m-0 mb-5 font-display text-[clamp(36px,4.6vw,70px)] font-bold leading-[1.02] tracking-[-0.035em]";
const h3Cls = "m-0 mb-2 font-display text-[clamp(15px,1.3vw,19px)] font-bold tracking-[-0.01em] text-white";
const bodyCls = "m-0 mb-4 text-[clamp(14px,1.08vw,16px)] leading-[1.6] text-white/90";

/** desktop: copy sits in the upper part of the frame, clear of the art below */
const panelLeft = "bottom-[8dvh] left-5 md:bottom-auto md:left-[5vw] md:top-[15dvh]";
const panelRight =
  "bottom-[8dvh] left-5 md:bottom-auto md:left-auto md:right-[5vw] md:top-[15dvh]";

/* ------------------------------------------------------------------- story */

export function HeritageStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion() ?? false;
  const [size, setSize] = useState({ vw: 1440, vh: 900 });

  useEffect(() => {
    const measure = () =>
      setSize({ vw: window.innerWidth, vh: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const geo = useMemo(() => {
    const { vw, vh } = size;
    const s = Math.max(vw / WORLD_W, vh / (vw < 768 ? SCENE_H_NARROW : SCENE_H));
    const worldPxW = WORLD_W * s;
    const worldPxH = WORLD_H * s;
    const viewUnits = vh / s;
    // On wide screens less of the world fits vertically. Start the camera
    // lower so the hero's street, river and rocks are always in frame; the
    // peaks live on the slow sky layer and settle behind the title instead.
    const start = Math.max(0, HERO_FLOOR - viewUnits);
    const unitsPerP = Math.max(1, WORLD_H - viewUnits - start);
    const travel = unitsPerP * s;
    const at = SCENE_CENTERS.map((c) =>
      clamp((c - viewUnits / 2 - start) / unitsPerP)
    );
    return {
      s,
      startPx: start * s,
      worldPxW,
      worldPxH,
      offsetX: (vw - worldPxW) / 2,
      travel,
      sectionH: vh + travel,
      unitsPerP,
      at,
    };
  }, [size]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // The camera glides after the scrollbar instead of snapping to it —
  // the weighty, cinematic drift of the reference.
  const glide = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 32,
    mass: 0.45,
    restDelta: 0.00005,
  });
  const progress = reduce ? scrollYProgress : glide;

  const worldY = useMotionValue(0);
  const skyY = useMotionValue(0);
  const caveY = useMotionValue(0);
  const foreY = useMotionValue(0);

  const apply = useCallback(
    (v: number) => {
      const T = geo.travel;
      const S0 = geo.startPx;
      worldY.set(-S0 - v * T);
      // the sky only takes a third of the start offset, so the peaks stay up
      skyY.set(-S0 * 0.35 - v * T * DEPTH.sky);
      // anchored at the end (v = 1) where the cave view is composed
      caveY.set(-S0 - v * T + (v - 1) * T * (1 - DEPTH.cave));
      // anchored mid-journey so motes spread evenly
      foreY.set(-S0 - v * T + (v - 0.5) * T * (1 - DEPTH.fore));

    },
    [geo, worldY, skyY, caveY, foreY]
  );
  useMotionValueEvent(progress, "change", apply);
  useEffect(() => apply(progress.get()), [apply, progress]);

  const barScale = useTransform(progress, [0, 1], [0, 1]);

  // SMIL animations in the chambers ignore CSS — pause them for reduced motion
  useEffect(() => {
    if (!reduce) return;
    sectionRef.current
      ?.querySelectorAll("svg")
      .forEach((svg) => (svg as SVGSVGElement).pauseAnimations?.());
  }, [reduce]);

  const layer = (y: MotionValue<number>) => ({
    position: "absolute" as const,
    top: 0,
    left: geo.offsetX,
    y,
  });

  return (
    <section
      id="story"
      ref={sectionRef}
      style={{ height: geo.sectionH }}
      className="relative bg-[#0d0820]"
    >
      <SmoothScroll />
      <div className="sticky top-0 h-dvh w-full overflow-hidden">
        {/* ---- the world: four parallax depths sharing one coordinate space */}
        <motion.div
          className="absolute inset-0"
          style={{ transformOrigin: "50% 35%" }}
          initial={reduce ? false : { scale: 1.12, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2.2, ease: EASE }}
        >
          <motion.svg
            aria-hidden
            viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
            width={geo.worldPxW}
            height={geo.worldPxH}
            style={{ ...layer(skyY), overflow: "visible" }}
            className="pointer-events-none"
          >
            <WorldDefs />
            <SkyLayer />
          </motion.svg>
          <motion.svg
            aria-hidden
            viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
            width={geo.worldPxW}
            height={geo.worldPxH}
            style={{ ...layer(caveY), overflow: "visible" }}
            className="pointer-events-none"
          >
            <CaveSunset />
          </motion.svg>
          <motion.svg
            aria-hidden
            viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
            width={geo.worldPxW}
            height={geo.worldPxH}
            style={layer(worldY)}
            className="pointer-events-none"
          >
            <WorldLayer />
          </motion.svg>
          <motion.svg
            aria-hidden
            viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
            width={geo.worldPxW}
            height={geo.worldPxH}
            style={{ ...layer(foreY), overflow: "visible" }}
            className="pointer-events-none"
          >
            <ForeLayer />
          </motion.svg>
        </motion.div>

        {/* cinematic vignette + legibility scrim so the nav always reads */}
        <div className="hb-vignette pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0d0a22]/30 to-transparent" />

        {/* ---- copy */}
        <div className="absolute inset-0">
          {/* 0 · hero */}
          <Panel
            progress={progress}
            at={geo.at[0]}
            unitsPerP={geo.unitsPerP}
            holdBefore
            className="inset-x-0 top-[17dvh] flex flex-col items-center px-5 text-center text-white"
          >
            <IntroWordmark text="Heritage" still={reduce} />
            <motion.p
              className="m-0 mt-[clamp(14px,3.2dvh,34px)] pl-[0.32em] font-body text-[clamp(11px,1.8vw,26px)] font-light uppercase leading-none tracking-[0.32em] text-white/90 drop-shadow-[0_2px_12px_rgba(60,20,90,0.35)]"
              initial={reduce ? false : { opacity: 0, letterSpacing: "0.9em" }}
              animate={{ opacity: 1, letterSpacing: "0.32em" }}
              transition={{ duration: 1.6, delay: 1.1, ease: EASE }}
            >
              Buildings, remembered
            </motion.p>
          </Panel>

          {/* scroll hint, parked at the bottom so it never sits on the art */}
          {/* <Panel
            progress={progress}
            at={geo.at[0]}
            unitsPerP={geo.unitsPerP}
            holdBefore
            className="inset-x-0 bottom-5 flex justify-center"
          >
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.8, ease: EASE }}
              className="flex items-center gap-3 rounded-full border border-white/20 bg-black/30 px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/80 backdrop-blur-md"
            >
              <span className="relative h-5 w-[1.5px] overflow-hidden bg-white/25">
                <motion.span
                  className="absolute inset-x-0 top-0 h-2 bg-white"
                  animate={{ y: [-8, 20] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />
              </span>
              Scroll
            </motion.div>
          </Panel> */}

          {/* 1 · mission (left) */}
          <Panel
            progress={progress}
            at={geo.at[1]}
            unitsPerP={geo.unitsPerP}
            className={panelLeft}
          >
            <div className={textCard}>
              <Item i={0} mask>
                <h2 className={h2Cls}>Our Mission</h2>
              </Item>
              <Rule />
              <Item i={1}>
                <p className={`${bodyCls} md:text-justify`}>
                  We translate the world&apos;s heritage buildings into refined,
                  print-ready 3D models — every cornice, arch and column rebuilt
                  by hand, so history can sit on your shelf.
                </p>
              </Item>
              <Item i={2}>
                <p className={`${bodyCls} !mb-8 md:text-justify`}>
                  By mapping and measuring each landmark with care, we keep the
                  proportions honest and the details crisp enough to print.
                </p>
              </Item>
              <Item i={3}>
                <Link
                  href="/studio"
                  className="inline-block rounded-[3px] bg-white px-7 py-3 text-[clamp(13px,1vw,15px)] font-semibold text-[#150c34] no-underline shadow-[0_3px_0_rgba(120,100,200,0.55),0_10px_30px_rgba(10,6,30,0.35)] transition-transform hover:-translate-y-0.5"
                >
                  Let&apos;s Build!
                </Link>
              </Item>
            </div>
          </Panel>

          {/* 2 · advantages (right) */}
          <Panel
            progress={progress}
            at={geo.at[2]}
            unitsPerP={geo.unitsPerP}
            className={panelRight}
          >
            <div className={textCard}>
              <Item i={0} mask>
                <h2 className={h2Cls}>Our Advantages</h2>
              </Item>
              <Rule />
              <Item i={1}>
                <h3 className={h3Cls}>Faithful to the Original.</h3>
                <p className={bodyCls}>
                  Archival drawings, site surveys and photogrammetry set the
                  proportions before a single polygon is drawn.
                </p>
                <p className={`${bodyCls} !mb-8`}>
                  So whether it&apos;s a cathedral façade or a market hall, the
                  model on your plate reads like the building on the street.
                </p>
              </Item>
              <Item i={2}>
                <h3 className={h3Cls}>Boldly Print-Ready.</h3>
                <p className={`${bodyCls} !mb-0`}>
                  Clean, layered parts — walls, roofs, domes, details — tested on
                  Bambu Lab printers and split for multi-colour builds. Open the
                  file, pick your filaments and press print.
                </p>
              </Item>
            </div>
          </Panel>

          {/* 3 · studio (left) */}
          <Panel
            progress={progress}
            at={geo.at[3]}
            unitsPerP={geo.unitsPerP}
            className={panelLeft}
          >
            <div className={textCard}>
              <Item i={0}>
                <h3 className={h3Cls}>A Model Built For You.</h3>
                <p className={`${bodyCls} !mb-9`}>
                  Pick a landmark, reshape its layers and choose your filament
                  colours — all in the browser, with a live 3D preview and
                  per-layer height and visibility controls.
                </p>
              </Item>
              <Item i={1}>
                <h3 className={h3Cls}>Ready for Your Printer.</h3>
                <p className={`${bodyCls} !mb-0`}>
                  Set your printer, then export a multi-colour 3MF with every
                  part already assigned, or a single merged STL for any slicer.
                </p>
              </Item>
            </div>
          </Panel>

          {/* 4 · finale */}
          <Panel
            progress={progress}
            at={geo.at[4]}
            unitsPerP={geo.unitsPerP}
            holdAfter
            className="inset-x-0 bottom-[6dvh] flex justify-center px-5"
          >
            {/* no card: the sunset stays open, a soft scrim keeps the copy legible */}
            <div className="hb-card flex w-[min(560px,100%)] flex-col items-center text-center text-white [text-shadow:0_2px_18px_rgba(20,10,50,0.55)]">
              <Item i={0} mask>
                <h2 className="m-0 mb-3 font-display text-[clamp(28px,3.6vw,52px)] font-bold tracking-[-0.03em]">
                  Step inside the Studio.
                </h2>
              </Item>
              <Item i={1}>
                <p className="m-0 mb-6 max-w-[420px] text-[clamp(14px,1.08vw,16px)] leading-[1.6] text-white/90">
                  Choose a landmark and make it yours.
                </p>
              </Item>
              <Item i={2}>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    href="/studio"
                    className="hb-cta relative overflow-hidden rounded-[3px] bg-white px-7 py-3 text-[clamp(13px,1vw,15px)] font-semibold text-[#150c34] no-underline shadow-[0_3px_0_rgba(120,100,200,0.55),0_10px_30px_rgba(10,6,30,0.35)] [text-shadow:none] transition-transform hover:-translate-y-0.5"
                  >
                    Open the Studio
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-[3px] border border-white/70 px-7 py-3 text-[clamp(13px,1vw,15px)] font-medium text-white no-underline transition-colors hover:bg-white/10"
                  >
                    Sign in
                  </Link>
                </div>
              </Item>
            </div>
          </Panel>
        </div>

        {/* progress hairline */}
        <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-[3px] bg-white/[0.06] md:block">
          <motion.div
            className="h-full w-full origin-top"
            style={{
              scaleY: barScale,
              background: "linear-gradient(180deg,#ffd29a,#ff9a5c,#e0589b)",
            }}
          />
        </div>
      </div>
    </section>
  );
}
