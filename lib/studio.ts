// Studio configurator data — cities, printable locations, printers.

export type StudioLocation = {
  slug: string;
  name: string;
  area: string;
  coords: string;
  completed: boolean; // true = model ready & clickable, false = in modelling & click not allowed
};

export type StudioCity = {
  slug: string;
  name: string;
  country: string;
  available: boolean;
  locations: StudioLocation[];
};

export type StudioBuilding = {
  slug: string;
  name: string;
  country: string;
  city_slug: string;
  city_name: string;
  area?: string;
  coords?: string;
  available: boolean;
};

// Cities are fetched dynamically from Supabase database tables (`cities` and `places`).
export const studioCities: StudioCity[] = [];

// Bambu Lab printers — build volume in mm (W × D × H).
export type Printer = {
  id: string;
  name: string;
  bed: [number, number, number];
};

export const printers: Printer[] = [
  { id: "a1-mini", name: "A1 mini", bed: [180, 180, 180] },
  { id: "a1", name: "A1", bed: [256, 256, 256] },
  { id: "p1s", name: "P1S", bed: [256, 256, 256] },
  { id: "x1c", name: "X1 Carbon", bed: [256, 256, 256] },
  { id: "h2d", name: "H2D", bed: [325, 320, 325] },
];

// Scene scale: 1 three.js unit = 50 mm.
export const MM = 1 / 50;

export const FILAMENT_LINES = [
  {
    line: 'PLA Basic',
    colors: {
      'Jade White': '#FFFFFF',
      'Black': '#000000',
      'Silver': '#A6A9AA',
      'Gray': '#8E9089',
      'Light Gray': '#D1D3D5',
      'Dark Gray': '#545454',
      'Red': '#C12E1F',
      'Beige': '#F7E6DE',
      'Magenta': '#EC008C',
      'Pink': '#F55A74',
      'Hot Pink': '#F5547C',
      'Maroon Red': '#9D2235',
      'Orange': '#FF6A13',
      'Pumpkin Orange': '#FF9016',
      'Yellow': '#F4EE2A',
      'Gold': '#E4BD68',
      'Sunflower Yellow': '#FEC600',
      'Bambu Green': '#00AE42',
      'Mistletoe Green': '#3F8E43',
      'Bright Green': '#BECF00',
      'Blue': '#0A2989',
      'Blue Gray': '#5B6579',
      'Cyan': '#0086D6',
      'Cobalt Blue': '#0056B8',
      'Turquoise': '#00B1B7',
      'Purple': '#5E43B7',
      'Indigo Purple': '#482960',
      'Brown': '#9D432C',
      'Bronze': '#847D48',
      'Cocoa Brown': '#6F5034',
    },
  },
  {
    line: 'PLA Pure',
    colors: {
      'Pure White': '#FFFFFF',
      'Absolute Black': '#000000',
      'Baby Blue': '#A5DAE9',
      'Milky Pink': '#F8CDD8',
      'Apricot': '#FFB672',
    },
  },
];

export const DEFAULT_LAYER_COLORS: Record<string, string> = {
  trees: "#3F8E43", // Mistletoe Green
  grass: "#3F8E43", // Bambu Green
  terrain: "#FFFFFF",
  "small-building": "#FFFFFF", // Jade White
  "main-building": "#FFFFFF", // Jade White
  roads: "#000000", // Dark Gray
  water: "#0086D6", // Cyan / Light Blue
};

/**
 * Infer default Bambu filament hex color from a part or file name.
 * e.g. "base-C12E1F" -> "#C12E1F", "middle-red" -> "#C12E1F", "tip-white" -> "#FFFFFF"
 */
export function inferColorFromName(filename: string): string | null {
  // 1. Direct 6-character hex extraction (e.g. base-C12E1F.stl, middle-FFFFFF.stl)
  const hexMatch =
    filename.match(/[-_]([0-9A-Fa-f]{6})(?:\.|$)/i) ||
    filename.match(/\b([0-9A-Fa-f]{6})\b/i);
  if (hexMatch && hexMatch[1]) {
    return `#${hexMatch[1].toUpperCase()}`;
  }

  // 2. Fallback to common filament color names
  const lower = filename.toLowerCase();
  if (lower.includes("red") || lower.includes("maroon")) return "#C12E1F"; // Bambu Red
  if (lower.includes("white")) return "#FFFFFF"; // Bambu Jade White
  if (lower.includes("black")) return "#000000"; // Bambu Black
  if (lower.includes("cyan") || lower.includes("azure")) return "#0086D6"; // Bambu Cyan
  if (lower.includes("blue")) return "#0056B8"; // Bambu Cobalt Blue
  if (lower.includes("green")) return "#3F8E43"; // Bambu Mistletoe Green
  if (lower.includes("yellow")) return "#FEC600"; // Bambu Sunflower Yellow
  if (lower.includes("orange")) return "#FF6A13"; // Bambu Orange
  if (lower.includes("purple") || lower.includes("violet")) return "#5E43B7"; // Bambu Purple
  if (lower.includes("pink") || lower.includes("magenta")) return "#F55A74"; // Bambu Pink
  if (lower.includes("gray") || lower.includes("grey")) return "#8E9089"; // Bambu Gray
  if (lower.includes("brown") || lower.includes("bronze") || lower.includes("cocoa")) return "#6F5034"; // Bambu Cocoa Brown
  if (lower.includes("gold")) return "#E4BD68"; // Bambu Gold
  if (lower.includes("beige")) return "#F7E6DE"; // Bambu Beige
  if (lower.includes("silver")) return "#A6A9AA"; // Bambu Silver
  return null;
}


// Live "Manipulate city" values (percentages + layer visibility + colors).
export type CityControls = {
  small: number; // small-building · vertical only
  large: number; // main-building · all axes (uniform)
  largeHeight: number; // main-building · extra height on top of the uniform scale
  terrain: number; // terrain · vertical only
  roads: number; // roads · vertical only
  trees: number; // trees · vertical only
  water: number; // water · vertical only
  enableWater: boolean; // default false
  hideRoads: boolean;
  hideTrees: boolean;
  hideGrass: boolean;
  // Base sub-foundation frame layer controls
  enableRevit: boolean;
  revitHeight: number; // base thickness in cm (0.5 to 5 cm)
  revitWidth: number; // base extra width on each side in cm (0 to 10 cm)
  revitBreadth: number; // base extra depth/breadth on each side in cm (0 to 10 cm)
  revitUniformScale: boolean; // true = single slider scales W+D equally
  revitUniform: number; // uniform extra W+D margin in cm (0 to 10 cm)
  // Base text engraving / embossing options
  enableBaseText: boolean;
  baseTextCustom?: string;
  baseTextSize: number; // font size in mm or relative scale (e.g. 5 - 25)
  baseTextFont: string; // "sans-serif" | "serif" | "monospace" | "display"
  baseTextColor: string; // hex color for text
  baseTextPosition: "front" | "back" | "left" | "right" | "top"; // position on the base
  baseTextDepth: number; // extrusion depth in mm (e.g. 0.5 - 3mm)
  baseTextPosX?: number; // -100 to 100 percentage offset along X (left/right on base)
  baseTextPosZ?: number; // -100 to 100 percentage offset along Z (front/back on base)
  // Filament Color customization
  enableColors: boolean;
  layerColors: Record<string, string>;
};

export const CITY_DEFAULTS: CityControls = {
  small: 100,
  large: 100,
  largeHeight: 100,
  terrain: 100,
  roads: 100,
  trees: 100,
  water: 50,
  enableWater: false,
  hideRoads: false,
  hideTrees: false,
  hideGrass: false,
  enableRevit: true,
  revitHeight: 0.5, // cm — default 0.5cm (5mm) thickness; max 5cm
  revitWidth: 10,   // cm — extra margin on each side; max 10cm
  revitBreadth: 10, // cm — extra margin on each side; max 10cm
  revitUniformScale: true,
  revitUniform: 10, // cm — uniform W+D margin; max 10cm
  enableBaseText: true,
  baseTextSize: 12,
  baseTextFont: "sans-serif",
  baseTextColor: "#FFFFFF",
  baseTextPosition: "top",
  baseTextDepth: 1.0,
  baseTextPosX: 0,
  baseTextPosZ: 75,
  enableColors: false,
  layerColors: {},
};

