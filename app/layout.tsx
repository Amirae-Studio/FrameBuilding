import type { Metadata } from "next";
import { Manrope, Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeProvider } from "../lib/theme";

const display = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display-sans",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Heritage — Buildings, remembered",
  description:
    "Heritage translates the world's landmark buildings into refined, print-ready 3D models. Configure layers, colours and printer in the Studio, then download 3MF or STL.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          // Resolve theme before paint to avoid a flash of the wrong mode.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('hb-theme');if(!m){m=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',m);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`,
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
