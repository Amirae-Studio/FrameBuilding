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
      <linearGradient id="g-cave-sky" gradientUnits="userSpaceOnUse" x1="0" y1="4300" x2="0" y2="4860">
        <stop offset="0" stopColor="#8a5a9a" />
        <stop offset="0.3" stopColor="#d9837f" />
        <stop offset="0.68" stopColor="#f6a86a" />
        <stop offset="1" stopColor="#ffd48a" />
      </linearGradient>
      <linearGradient id="g-cave-sea" gradientUnits="userSpaceOnUse" x1="0" y1="4860" x2="0" y2="5200">
        <stop offset="0" stopColor="#e9b48e" />
        <stop offset="0.1" stopColor="#8a86c0" />
        <stop offset="0.6" stopColor="#4b4f96" />
        <stop offset="1" stopColor="#2c2c6e" />
      </linearGradient>
      <radialGradient id="g-orb">
        <stop offset="0" stopColor="#fff2c4" />
        <stop offset="0.45" stopColor="#ffbd6a" />
        <stop offset="1" stopColor="#ff9a5c" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="g-cave-sun" gradientUnits="userSpaceOnUse" cx="560" cy="4850" r="520">
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

/** horizon of the sunset seen through the cave mouth */
const HORIZON = 4860;
/** inner edge of the cave mouth — a wide, low arch like the reference */
const ARCH = "M60,5200 V4880 C60,4520 260,4370 800,4370 C1340,4370 1540,4520 1540,4880 V5200";

/**
 * The sunset seen through the cave mouth. Rendered on its own, slower
 * parallax layer (behind the world) so the arch slides over it and the
 * view "opens up" with real depth. Over-extended top and bottom so the
 * parallax offset never exposes an edge.
 */
export function CaveSunset() {
  const r = rng(77);
  // glints on the water, densest in the sun's reflection
  const waves = Array.from({ length: 22 }).map((_, i) => {
    const y = HORIZON + 10 + i * 11;
    const nearSun = i % 3 !== 0;
    const x = nearSun ? 430 + r() * 200 : 200 + r() * 1100;
    const w = 30 + r() * (nearSun ? 120 : 160);
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
        opacity={nearSun ? 0.35 + r() * 0.4 : 0.15 + r() * 0.2}
      />
    );
  });
  return (
    <g>
      <rect x="-100" y="3650" width="1800" height="660" fill="#8a5a9a" />
      <rect x="-100" y="4300" width="1800" height={HORIZON - 4300} fill="url(#g-cave-sky)" />
      <rect className="hb-breathe" x="-100" y="4300" width="1800" height={HORIZON - 4300} fill="url(#g-cave-sun)" />
      {/* god rays falling from the cloud bank */}
      <g filter="url(#f-blur-s)">
        <rect x="488" y="4590" width="54" height={HORIZON - 4590} fill="#fff0c4" opacity="0.28" />
        <rect x="582" y="4600" width="34" height={HORIZON - 4600} fill="#fff0c4" opacity="0.2" />
        <rect x="640" y="4610" width="22" height={HORIZON - 4610} fill="#fff0c4" opacity="0.14" />
      </g>
      <circle className="hb-sun" cx="560" cy={HORIZON - 12} r="70" fill="#fff4cf" />
      <Cloud x={780} y={4585} s={1.7} o={0.6} drift={30} />
      <Cloud x={300} y={4660} s={0.7} o={0.45} drift={38} />
      <Cloud x={1250} y={4630} s={1.1} o={0.4} drift={44} />
      {/* distant islands on the horizon */}
      <polygon points={`120,${HORIZON} 170,${HORIZON - 14} 236,${HORIZON}`} fill="#c37a92" />
      <polygon points={`300,${HORIZON} 330,${HORIZON - 8} 360,${HORIZON}`} fill="#b06f90" />
      <rect x="-100" y={HORIZON} width="1800" height={5710 - HORIZON} fill="url(#g-cave-sea)" />
      {/* sun's reflection column */}
      <rect className="hb-shimmer" x="520" y={HORIZON + 4} width="80" height="240" fill="#fff0c8" opacity="0.4" filter="url(#f-blur-s)" />
      {waves}
      {/* lilac peak standing in the water */}
      <polygon points={`520,4905 766,4683 700,4905`} fill="#cdb0ec" />
      <polygon points={`766,4683 700,4905 830,4905`} fill="#b293dc" />
      <polygon points={`766,4683 830,4905 980,4905 860,4780`} fill="#8b6cc4" />
      <polygon points="766,4683 724,4752 758,4742 786,4770 800,4728" fill="#f4eaff" opacity="0.9" />
      <polygon points="520,4905 640,4800 610,4905" fill="#e2cdf6" opacity="0.7" />
      {/* the great rose mountain on the right */}
      <polygon points="683,5040 950,4760 1183,4550 1050,4800 900,5040" fill="#c98a96" />
      <polygon points="950,4760 1183,4550 1090,4650" fill="#e6b0ae" />
      <polygon points="760,4960 850,4880 905,5040 800,5040" fill="#dc9e9c" />
      <polygon points="1183,4550 1050,4800 900,5040 1160,5040 1120,4800" fill="#b2717f" />
      <polygon points="1183,4550 1120,4800 1160,5040 1360,5040 1262,4720" fill="#8b4f79" />
      <polygon points="1183,4550 1262,4720 1360,5040 1720,5040 1720,4760 1500,4700 1310,4610" fill="#6c3c6b" />
      <polygon points="1310,4610 1500,4700 1720,4760 1720,4690 1520,4640" fill="#8a5482" />
      {/* foreground rocks, lit from the sunset */}
      <polygon points="120,5012 200,4986 300,4990 384,5020 340,5044 150,5048" fill="#9a4ea6" />
      <polygon points="120,5012 200,4986 300,4990 250,5008" fill="#c274c6" />
      <polygon points="30,5200 60,5082 180,5040 330,5060 430,5120 470,5200" fill="#84398f" />
      <polygon points="60,5082 180,5040 330,5060 250,5092 120,5104" fill="#b45eb4" />
      <polygon points="330,5060 430,5120 470,5200 360,5200 300,5110" fill="#5f2a74" />
      <polygon points="560,5210 610,5150 720,5140 780,5210" fill="#5a2f78" />
      <polygon points="610,5150 720,5140 680,5165" fill="#7c4592" />
      {/* birds — gliding across with flapping wings */}
      <g className="hb-flock">
        {[[350, 4630], [395, 4660], [430, 4618], [372, 4690]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path
              className="hb-flap"
              style={{ animationDelay: `${-i * 0.23}s` }}
              d="M0,0 q8,-8 16,0 q8,-8 16,0"
              stroke="#5a3270"
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

/** Stepped circuit traces etched into the cave wall, like the reference. */
function CircuitWall() {
  const r = rng(91);
  const traces: React.ReactNode[] = [];
  for (let i = 0; i < 46; i++) {
    const x = -40 + r() * 1680;
    const y = 4040 + r() * 1100;
    const L = 60 + r() * 260;
    const L2 = 30 + r() * 140;
    const dir = r() < 0.5 ? 1 : -1;
    const up = r() < 0.5 ? 1 : -1;
    const d =
      r() < 0.5
        ? `M${x.toFixed(0)} ${y.toFixed(0)}h${(L * dir).toFixed(0)}v${(L2 * up).toFixed(0)}h${(40 * dir).toFixed(0)}`
        : `M${x.toFixed(0)} ${y.toFixed(0)}v${(L2 * up).toFixed(0)}h${(L * dir).toFixed(0)}v${(24 * up).toFixed(0)}`;
    const w = 3 + r() * 7;
    traces.push(
      <g key={i}>
        <path d={d} fill="none" stroke="#2c2468" strokeWidth={w.toFixed(1)} strokeLinejoin="miter" />
        <path d={d} fill="none" stroke="#463c96" strokeWidth="1" opacity="0.7" transform="translate(-1 -1)" />
        {i % 5 === 0 && (
          <path
            className="hbr-pipe"
            style={{ ["--dl" as string]: `${(-i * 0.6).toFixed(1)}s` }}
            d={d}
            fill="none"
            stroke="#9d8cff"
            strokeWidth="2"
            strokeDasharray="18 400"
            opacity="0.6"
          />
        )}
      </g>
    );
  }
  for (let i = 0; i < 14; i++) {
    const x = r() * 1600;
    const y = 4060 + r() * 1000;
    const w = 40 + r() * 120;
    const h = 24 + r() * 70;
    traces.push(
      <rect key={`c${i}`} x={x.toFixed(0)} y={y.toFixed(0)} width={w.toFixed(0)} height={h.toFixed(0)} fill="none" stroke="#30276e" strokeWidth="3" />
    );
  }
  return <g>{traces}</g>;
}

/** Cave wall with the arched opening — sits on the main layer. */
function CaveMouth() {
  const wall = `M-50,4030 H1650 V5260 H-50 Z ${ARCH} Z`;
  return (
    <g>
      <defs>
        <clipPath id="c-cave">
          <path clipRule="evenodd" d={wall} />
        </clipPath>
        <linearGradient id="g-cave-wall" gradientUnits="userSpaceOnUse" x1="0" y1="4030" x2="0" y2="5200">
          <stop offset="0" stopColor="#120a2f" />
          <stop offset="0.25" stopColor="#1d1650" />
          <stop offset="1" stopColor="#231a5c" />
        </linearGradient>
      </defs>
      <path fillRule="evenodd" fill="url(#g-cave-wall)" d={wall} />
      <g clipPath="url(#c-cave)">
        <CircuitWall />
        {/* stepped lip along the top of the opening */}
        {[
          [300, 4452, 70, 18],
          [470, 4396, 120, 16],
          [690, 4366, 90, 22],
          [960, 4370, 140, 14],
          [1200, 4410, 80, 24],
          [1380, 4500, 50, 30],
        ].map(([x, y, w, h]) => (
          <rect key={x} x={x} y={y} width={w} height={h} fill="#1d1650" />
        ))}
      </g>
      {/* warm rim light where the sunset catches the arch */}
      <path d={ARCH} fill="none" stroke="#ff9a5c" strokeOpacity="0.35" strokeWidth="3" />
      <path d="M60,4880 C60,4520 260,4370 800,4370" fill="none" stroke="#ffd58a" strokeOpacity="0.22" strokeWidth="14" filter="url(#f-blur-s)" />
    </g>
  );
}

/* ---------------------------------------------------------- embers & world */

function Embers() {
  const r = rng(3);
  return (
    <g>
      {Array.from({ length: 22 }).map((_, i) => {
        const y = 3300 + r() * 1000;
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
