import type { Metadata } from "next";
import { Inter, Fraunces, Newsreader, Lexend_Exa } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeProvider } from "../lib/theme";

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body-sans",
  display: "swap",
});

// FrameBuilding brand faces: Fraunces (display), Newsreader (serif),
// Lexend Exa (wide caps labels). Inter above is the brand sans.
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
});

const lexendExa = Lexend_Exa({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-lexend-exa",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FrameBuilding — Hand-modelled landmarks, ready to print",
  description:
    "FrameBuilding by Amiraé Studio: hand-modelled landmark buildings, engineered for a perfect 3D print. Pick a building, style its base, print it for your shelf.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${fraunces.variable} ${newsreader.variable} ${lexendExa.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          // Resolve theme before paint to avoid a flash of the wrong mode.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('hb-theme');if(!m){m='dark';}document.documentElement.setAttribute('data-theme',m);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
