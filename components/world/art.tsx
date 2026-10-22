/**
 * Heritage scroll-world artwork — pure SVG, no hooks, so it can be rendered
 * on the server and previewed as a still. World space is 1600 × 5200.
 *
 *   0 – 1016   S0  river city at dusk, peaks and clouds (hero, hero.tsx)
 *   1030–2030  S1  print chamber: glass tower, rising bubbles (mission)
 *   2030–3030  S2  survey wheel + blueprint holograms (advantages)
 *   3030–4030  S3  filament foundry: furnaces, molten streams (studio)
 *   4050–5200  S4  cave mouth opening onto the sunset (call to action)
 */
import { HeroSky, HeroStreet } from "./hero";
import {
  ADVANTAGES_SVG,
  CHAMBER_DEFS,
  CHAMBER_SCALE,
  MISSION_FALL,
  MISSION_SVG,
  STUDIO_SVG,
} from "./chambers";

export const WORLD_W = 1600;
export const WORLD_H = 5200;

/** y-centre of each scene (used to time the text panels). */
export const SCENE_CENTERS = [520, 1530, 2530, 3530, 4620] as const;

/* chamber placement in world space (scenes are 1440×900, scaled to 1600 wide) */
const MISSION_Y = 1030;
const ADV_Y = 2030;
const STUDIO_Y = 3030;
const cx = (x: number) => x * CHAMBER_SCALE;
/** hero canal spills exactly where the mission chamber's waterfall enters */
const SPILL_X0 = cx(MISSION_FALL.x);
const SPILL_X1 = cx(MISSION_FALL.x + MISSION_FALL.w);


/* ------------------------------------------------------------------ helpers */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}



/* ------------------------------------------------------------------- defs */

export function WorldDefs() {
  return (
    <defs>
      <linearGradient id="g-sky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="640">
        <stop offset="0" stopColor="#6a4c97" />
        <stop offset="0.38" stopColor="#b782b6" />
        <stop offset="0.66" stopColor="#f09c90" />
        <stop offset="0.9" stopColor="#ffc47c" />
        <stop offset="1" stopColor="#ffdca0" />
      </linearGradient>
      <radialGradient id="g-sun" gradientUnits="userSpaceOnUse" cx="800" cy="560" r="480">
        <stop offset="0" stopColor="#fff0c0" stopOpacity="0.95" />
        <stop offset="0.35" stopColor="#ffc47c" stopOpacity="0.5" />
        <stop offset="1" stopColor="#ffc47c" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="g-water" gradientUnits="userSpaceOnUse" x1="0" y1="570" x2="0" y2="1010">
        <stop offset="0" stopColor="#e4f0ff" />
        <stop offset="0.45" stopColor="#86b6f4" />
        <stop offset="1" stopColor="#9a84ee" />
      </linearGradient>
      <linearGradient id="g-ground" gradientUnits="userSpaceOnUse" x1="0" y1="560" x2="0" y2="1010">
        <stop offset="0" stopColor="#6a4a96" />
        <stop offset="1" stopColor="#2c1a58" />
      </linearGradient>
      <linearGradient id="g-glow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffbf72" />
        <stop offset="0.55" stopColor="#f2757f" />
        <stop offset="1" stopColor="#c44a9a" />
      </linearGradient>
      <linearGradient id="g-violet-room" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7d62e8" />
        <stop offset="1" stopColor="#3d2a8c" />
      </linearGradient>
      <linearGradient id="g-fall" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#9db4ff" stopOpacity="0" />
        <stop offset="0.5" stopColor="#d6e0ff" stopOpacity="0.85" />
        <stop offset="1" stopColor="#9db4ff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="g-world" gradientUnits="userSpaceOnUse" x1="0" y1="980" x2="0" y2="4100">
        <stop offset="0" stopColor="#21144f" />
        <stop offset="0.5" stopColor="#170e3d" />
        <stop offset="1" stopColor="#120a2f" />
      </linearGradient>
      <linearGradient id="g-lamp" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffe9a0" stopOpacity="0.95" />
        <stop offset="1" stopColor="#ffe9a0" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="g-cave-sky" gradientUnits="userSpaceOnUse" x1="0" y1="4300" x2="0" y2="5050">
        <stop offset="0" stopColor="#4a3482" />
        <stop offset="0.45" stopColor="#d4609a" />
        <stop offset="0.8" stopColor="#ff9f6b" />
        <stop offset="1" stopColor="#ffd08a" />
      </linearGradient>
      <linearGradient id="g-cave-sea" gradientUnits="userSpaceOnUse" x1="0" y1="5000" x2="0" y2="5200">
        <stop offset="0" stopColor="#ffb98a" />
        <stop offset="0.5" stopColor="#a56bc4" />
        <stop offset="1" stopColor="#3d2a7c" />
      </linearGradient>
      <radialGradient id="g-orb">
        <stop offset="0" stopColor="#fff2c4" />
        <stop offset="0.45" stopColor="#ffbd6a" />
        <stop offset="1" stopColor="#ff9a5c" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="g-cave-sun" gradientUnits="userSpaceOnUse" cx="470" cy="4985" r="460">
        <stop offset="0" stopColor="#fff4cf" stopOpacity="1" />
        <stop offset="0.3" stopColor="#ffc47c" stopOpacity="0.6" />
        <stop offset="1" stopColor="#ffc47c" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="g-mist" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffd9c8" stopOpacity="0" />
        <stop offset="1" stopColor="#ffd9c8" stopOpacity="0.55" />
      </linearGradient>
      <filter id="f-blur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="14" />
      </filter>
      <filter id="f-blur-s" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="5" />
      </filter>
      <g dangerouslySetInnerHTML={{ __html: CHAMBER_DEFS }} />
    </defs>
  );
}

/* --------------------------------------------------------- SKY (slow layer) */

function Cloud({
  x,
  y,
  s = 1,
  o = 0.5,
  drift = 0,
}: {
  x: number;
  y: number;
  s?: number;
  o?: number;
  /** seconds for one drift cycle; 0 = static */
  drift?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o} fill="#ffe6ee">
      <g
        className={drift ? "hb-drift" : undefined}
        style={drift ? { animationDuration: `${drift}s`, animationDelay: `${-(x % 7)}s` } : undefined}
      >
        <ellipse cx="0" cy="0" rx="120" ry="22" />
        <ellipse cx="-60" cy="-14" rx="64" ry="20" />
        <ellipse cx="40" cy="-20" rx="80" ry="24" />
      </g>
    </g>
  );
}


/** Sky, sun, peaks and clouds. Rendered on the slow parallax layer. */
export function SkyLayer() {
  return <HeroSky />;
}

/* ----------------------------------------------------------- S0: hero */

export function HeroScene() {
  return (
    <g>
      <HeroStreet spill={[SPILL_X0, SPILL_X1]} />
      {/* jagged ledge the canal spills over — gap lines up with the mission falls */}
      <polygon
        points={`-50,1016 60,1034 160,1018 270,1040 380,1020 480,1038 ${SPILL_X0 - 40},1018 ${SPILL_X0},1024 ${SPILL_X0},1060 -50,1060`}
        fill="#1b1046"
      />
      <polygon
        points={`${SPILL_X1},1022 ${SPILL_X1 + 60},1040 1010,1020 1130,1040 1250,1018 1380,1038 1650,1016 1650,1060 ${SPILL_X1},1060`}
        fill="#1b1046"
      />
      {/* the lip of the falls, pouring into the chamber below */}
      <rect x={SPILL_X0} y="1012" width={SPILL_X1 - SPILL_X0} height="40" fill="url(#hbr-fallH)" />
      <rect x={SPILL_X0} y="1012" width={SPILL_X1 - SPILL_X0} height="40" fill="url(#hbr-streak)" />
      <ellipse className="hb-mist" cx={(SPILL_X0 + SPILL_X1) / 2} cy="1016" rx="130" ry="10" fill="#eaf3ff" opacity="0.8" />
    </g>
  );
}
















/* --------------------------------------------------- S4: cave to sunset */

/**
 * The sunset seen through the cave mouth. Rendered on its own, slower
 * parallax layer (behind the world) so the arch slides over it and the
 * view "opens up" with real depth. Over-extended top and bottom so the
 * parallax offset never exposes an edge.
 */
export function CaveSunset() {
  const r = rng(77);
  const waves = Array.from({ length: 14 }).map((_, i) => {
    const y = 5030 + i * 12;
    const x = 360 + r() * 700;
    const w = 40 + r() * 160;
    return (
      <rect
        key={i}
        className="hb-wave"
        style={{ animationDelay: `${(-r() * 4).toFixed(2)}s`, animationDuration: `${(3.5 + r() * 3).toFixed(1)}s` }}
        x={x}
        y={y}
        width={w}
        height="3"
        rx="1.5"
        fill="#fff0c8"
        opacity={0.25 + r() * 0.35}
      />
    );
  });
  return (
    <g>
      <rect x="-100" y="3650" width="1800" height="620" fill="#4a3482" />
      <rect x="-100" y="4250" width="1800" height="950" fill="url(#g-cave-sky)" />
      <rect className="hb-breathe" x="-100" y="4250" width="1800" height="950" fill="url(#g-cave-sun)" />
      <circle className="hb-sun" cx="470" cy="4975" r="58" fill="#fff4cf" />
      <Cloud x={560} y={4620} s={1.2} o={0.5} drift={30} />
      <Cloud x={1040} y={4560} s={1} o={0.4} drift={38} />
      <rect x="-100" y="5010" width="1800" height="700" fill="url(#g-cave-sea)" />
      <rect x="-100" y="5200" width="1800" height="510" fill="#3d2a7c" />
      {/* sun's reflection column */}
      <rect className="hb-shimmer" x="440" y="5016" width="60" height="150" fill="#fff0c8" opacity="0.35" filter="url(#f-blur-s)" />
      {waves}
      {/* distant islands */}
      <polygon points="260,5014 330,4970 400,5014" fill="#8f5fb5" />
      <polygon points="1210,5014 1330,4880 1470,5014" fill="#6b43a0" />
      {/* hero mountain */}
      <polygon points="880,5030 1110,4560 1290,4780 1360,5030" fill="#8a4f90" />
      <polygon points="1110,4560 1290,4780 1360,5030 1140,5030 1100,4800" fill="#5a2f78" />
      <polygon points="1110,4560 1040,4700 1090,4690 1130,4760" fill="#f6dff0" opacity="0.8" />
      <polygon points="660,5030 820,4830 940,5030" fill="#c9a2e6" />
      <polygon points="820,4830 940,5030 850,5030" fill="#9468c4" />
      {/* birds — gliding across with flapping wings */}
      <g className="hb-flock">
        {[[540, 4560], [610, 4600], [700, 4530], [660, 4640]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path
              className="hb-flap"
              style={{ animationDelay: `${-i * 0.23}s` }}
              d="M0,0 q10,-10 20,0 q10,-10 20,0"
              stroke="#4a2a70"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>
    </g>
  );
}

/** Dark cave mass with the arched opening — sits on the main layer. */
function CaveMouth() {
  return (
    <g>
      {/* cave mouth — dark mass with an arched opening */}
      <path
        fillRule="evenodd"
        fill="#0d0820"
        d={`M-50,4050 H1650 V5200 H-50 Z
            M240,5200 V4700 Q240,4300 800,4300 Q1360,4300 1360,4700 V5200 Z`}
      />
      <path d="M240,5200 V4700 Q240,4300 800,4300 Q1360,4300 1360,4700 V5200" fill="none" stroke="#ff9a5c" strokeOpacity="0.5" strokeWidth="4" />
      {/* rim light & stalactites */}
      <path d="M240,4700 Q240,4300 800,4300" fill="none" stroke="#ffd58a" strokeOpacity="0.35" strokeWidth="14" filter="url(#f-blur-s)" />
      {[330, 470, 640, 980, 1130, 1250].map((x, i) => (
        <polygon key={x} points={`${x},4390 ${x + 26},4390 ${x + 13},${4440 + (i % 3) * 22}`} fill="#0d0820" />
      ))}
      {/* ledge in front */}
      <polygon points="0,5200 0,5090 180,5050 380,5090 520,5200" fill="#0d0820" />
      <polygon points="1600,5200 1600,5100 1420,5060 1240,5110 1100,5200" fill="#0d0820" />
    </g>
  );
}

/* ---------------------------------------------------------- embers & world */

function Embers() {
  const r = rng(3);
  return (
    <g>
      {Array.from({ length: 22 }).map((_, i) => {
        const y = 3300 + r() * 1700;
        const x = 200 + r() * 1200;
        return (
          <circle
            key={i}
            className="hb-ember"
            style={{ animationDelay: `${(r() * 6).toFixed(2)}s`, animationDuration: `${(5 + r() * 4).toFixed(1)}s` }}
            cx={x}
            cy={y}
            r={2 + r() * 3}
            fill="#ffb36b"
          />
        );
      })}
    </g>
  );
}

/** Everything except the sky: the main (1×) parallax layer. */
export function WorldLayer() {
  return (
    <g>
      {/* underground / interior backdrop */}
      <rect x="-100" y="1000" width="1800" height="3260" fill="url(#g-world)" />
      {/* faint structural ribs */}
      {[60, 1540].map((x) => (
        <rect key={x} x={x - 20} y="1000" width="40" height="3200" fill="#0f0828" opacity="0.55" />
      ))}
      <HeroScene />
      {/* S1 · mission and S2 · advantages chambers */}
      <g
        transform={`translate(0 ${MISSION_Y}) scale(${CHAMBER_SCALE})`}
        dangerouslySetInnerHTML={{ __html: MISSION_SVG }}
      />
      <g
        transform={`translate(0 ${ADV_Y}) scale(${CHAMBER_SCALE})`}
        dangerouslySetInnerHTML={{ __html: ADVANTAGES_SVG }}
      />
      <g
        transform={`translate(0 ${STUDIO_Y}) scale(${CHAMBER_SCALE})`}
        dangerouslySetInnerHTML={{ __html: STUDIO_SVG }}
      />
      <CaveMouth />
      <Embers />
    </g>
  );
}

/**
 * Foreground bokeh — soft out-of-focus motes on a fast parallax layer
 * in front of everything, so the camera feels like it is moving through
 * space rather than sliding a flat picture.
 */
export function ForeLayer() {
  const r = rng(101);
  return (
    <g>
      {Array.from({ length: 26 }).map((_, i) => {
        const y = 700 + r() * 4700;
        // keep the motes to the outer thirds so they never sit on the copy
        const side = r() > 0.5;
        const x = side ? 1040 + r() * 560 : r() * 560;
        const rad = 6 + r() * 20;
        const warm = y > 3000;
        return (
          <circle
            key={i}
            className="hb-mote"
            style={{ animationDelay: `${(-r() * 8).toFixed(2)}s`, animationDuration: `${(7 + r() * 6).toFixed(1)}s` }}
            cx={x}
            cy={y}
            r={rad}
            fill={warm ? "#ffc489" : "#d9ccff"}
            opacity={0.12 + r() * 0.18}
            filter="url(#f-blur-s)"
          />
        );
      })}
    </g>
  );
}
