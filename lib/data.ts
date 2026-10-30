// Shared site data for Heritage.

export type Accent = { value: string; rgb: string; label: string };

export const accents: Accent[] = [
  { value: "#d97f92", rgb: "217, 127, 146", label: "Rose" },
  { value: "#e0589b", rgb: "224, 88, 155", label: "Magenta" },
  { value: "#8a6bff", rgb: "138, 107, 255", label: "Violet" },
  { value: "#ffc15a", rgb: "255, 193, 90", label: "Amber" },
];

export const heritageSteps = [
  {
    no: "01",
    title: "Researched",
    body: "Archival drawings, site surveys and photogrammetry set the proportions of every landmark before a single polygon is drawn.",
  },
  {
    no: "02",
    title: "Modelled by hand",
    body: "Each cornice, arch and column is rebuilt by hand into clean, print-ready layers — never an automatic scan dump.",
  },
  {
    no: "03",
    title: "Tested & tuned",
    body: "Every part is test-printed on Bambu Lab machines until it holds, then released to the Studio for you to configure.",
  },
] as const;
