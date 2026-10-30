/* eslint-disable @next/next/no-img-element */
import "./landing.css";
import { art } from "./art";
import { HowCarousel, MagazineScroller, MissionSlides, RevealOnScroll, type HowStep } from "./interactive";
import { LandingNav } from "./LandingNav";
import { BACK_URL, CONTACT_EMAIL, DISCORD_URL, INSTAGRAM_URL } from "./links";
import type { NavUser } from "../../lib/user";

const IMG = "/landing";
const cssVars = (v: Record<string, string>) => v as React.CSSProperties;
const html = (__html: string) => ({ __html });

const SLIDES = [
  {
    src: `${IMG}/render-lineup-dark.jpg`,
    alt: "Six white 3D-printed landmark models on a dark table: two New York towers, the Empire State Building, the Leaning Tower of Pisa, the Sydney Opera House and a neoclassical hall",
    caption: "The launch lineup",
  },
  {
    src: `${IMG}/render-pisa.jpg`,
    alt: "Close-up of the Leaning Tower of Pisa model on a round base engraved 'Tower of Pisa'",
    caption: "Leaning Tower of Pisa, on an engraved base",
  },
  {
    src: `${IMG}/render-opera.jpg`,
    alt: "Sydney Opera House model printed in white and walnut brown",
    caption: "Sydney Opera House, two-colour print",
  },
];

const STEPS: HowStep[] = [
  {
    c: "#8b84cc",
    strip: "#a3a4e4",
    art: art.pick(),
    title: "Pick a building",
    desc: "Choose from a growing library of hand-modelled landmarks, from New York's Art Deco towers to Pisa's leaning campanile. New buildings are added through community votes.",
    href: "#library",
    link: "See the library",
  },
  {
    c: "#d5738b",
    strip: "#eea0b2",
    art: art.base(),
    title: "Style the base",
    desc: "In the Studio, stack plinths, pedestals or slanted plaques, engrave a name on any side, choose finishes and preview everything live in 3D.",
    href: "/studio",
    link: "Open the Studio",
  },
  {
    c: "#8894e0",
    strip: "#b4bcef",
    art: art.print(),
    title: "Print & display",
    desc: "Download a 3MF with every base and tier as its own part, ready for multi-colour AMS printing, or a single STL for any slicer.",
    href: "#faq",
    link: "File formats",
  },
];

const GALLERY = [
  {
    c: "#3d3556",
    date: "Render",
    cat: "Launch set",
    src: "render-lineup-soft.jpg",
    alt: "The six launch landmarks in soft studio light",
    title: "Six landmarks, one shelf: the FrameBuilding launch set",
    text: "New York towers, the Empire State Building, Pisa, Sydney and a neoclassical hall, all printed in a single white filament so the architecture does the talking.",
    href: "#library",
    link: "The library",
  },
  {
    c: "#6a6fac",
    date: "Render",
    cat: "Detail study",
    src: "render-pisa.jpg",
    alt: "Leaning Tower of Pisa model on an engraved round base",
    title: "Leaning Tower of Pisa: seven tiers of arcades, one engraved base",
    text: "Every column of the campanile is modelled individually, then set on a round pedestal with its name engraved straight from the Studio.",
    href: "/studio",
    link: "Try the Studio",
  },
  {
    c: "#3d3556",
    date: "Render",
    cat: "Two-colour print",
    src: "render-opera.jpg",
    alt: "Sydney Opera House model in white and brown",
    title: "Sydney Opera House: shells in white, terraces in walnut",
    text: "Because every part exports separately in the 3MF, a model like this splits cleanly across colours on an AMS without any repainting.",
    href: "#faq",
    link: "How the files work",
  },
  {
    c: "#6a6fac",
    date: "FrameCity",
    cat: "200+ buildings",
    src: "library-skyline.jpg",
    alt: "Dozens of hand-modelled skyscrapers and landmarks from the FrameCity library",
    title: "Where it started: more than 200 buildings modelled for FrameCity",
    text: "The same hands, the same workflow. FrameBuilding draws on the library we built for FrameCity's framed city districts.",
    href: "#about",
    link: "About FrameCity",
  },
];

const TIERS = [
  {
    c: "#8f3b4b",
    accent: "#f6c6b0",
    img: "tier-architect.jpg",
    alt: "Architect reward card: unlimited models, every future pack",
    label: "TIER I",
    num: "01",
    name: "Architect",
    pitch: "Built for makers who never stop at one.",
    perks: ["Unlimited models from the library", "Every future landmark pack", "Full access to the Studio", "Personal use licence"],
    eb: ["Early bird", "30% off · limited to 100"],
  },
  {
    c: "#28346f",
    accent: "#b8c8ff",
    img: "tier-merchant.jpg",
    alt: "Merchant reward card: sell what you print, forever",
    label: "TIER II",
    num: "02",
    name: "Merchant",
    pitch: "The plan that pays you back.",
    perks: ["Sell what you print, forever", "Commercial licence", "Unlimited models & every future pack", "Full access to the Studio"],
    eb: ["Early bird", "30% off · limited to 100"],
  },
  {
    c: "#1d2338",
    accent: "#e2bf6c",
    img: "tier-patron.jpg",
    alt: "Patron reward card: custom building, limited to 20",
    label: "BY ARRANGEMENT",
    num: "03",
    name: "Patron",
    pitch: "Name your building. We model it.",
    perks: ["One custom building, modelled to order", "Everything in Merchant", "Commercial licence", "Limited to 20 Patrons"],
    eb: ["Limited", "20 places in total"],
  },
];

const FAQS = [
  [
    "Is FrameBuilding a physical product?",
    "No. FrameBuilding gives you digital, 3D-printable model files (.3MF and .STL) that you configure in the Studio, download, and print yourself or through a local printing service.",
  ],
  [
    "Do I need a 3D printer?",
    "You need a printer, or access to one. The files are optimised for FDM printers and tested on Bambu Lab machines. You can also take the exported files to a print shop or an online printing service.",
  ],
  [
    "What files do I get?",
    "Production-ready .3MF and .STL files. The 3MF keeps each part separate (bases, tiers, roofs, domes and details) so you can assign filament colours in multi-colour setups such as the Bambu Lab AMS.",
  ],
  [
    "Can I customise a building before printing?",
    "Yes. In the Studio you can add and stack bases, choose presets like a museum plinth or round pedestal, engrave text on any side, adjust scale and preview everything live in 3D. You can also rescale the exported file in your slicer.",
  ],
  [
    "How accurate are the buildings?",
    "Every landmark is researched from archival drawings, surveys and reference imagery, then rebuilt by hand and test-printed so that the proportions and details hold up at print scale.",
  ],
  [
    "Can I sell the models I print?",
    "With the Merchant or Patron reward, yes. Both include a commercial licence to sell what you print. Architect is for personal use.",
  ],
  [
    "How is this different from FrameCity?",
    "FrameCity turns whole city districts into framed skyline art. FrameBuilding focuses on single landmarks as standalone models on bases you design. Both are made by Amiraé Studio and share one sign-in, but their rewards are separate.",
  ],
];

export function FrameBuildingLanding({ user }: { user: NavUser | null }) {
  return (
    <div className="fb">
      <LandingNav initialUser={user} />
      <RevealOnScroll />

      {/* HERO */}
      <section className="hero" id="hero" data-tone="dark" data-bg="transparent">
        <div className="hero-city" aria-hidden="true" dangerouslySetInnerHTML={html(art.heroCity())} />
        <div className="wrap hero-inner">
          <p className="eyebrow reveal">Amiraé Studio &middot; on MakerWorld</p>
          <h1 className="display hero-title reveal">
            Landmarks,
            <br />
            Printed.
          </h1>
          <p className="hero-lead reveal">
            Hand-modelled landmark buildings, engineered for a perfect print. Pick a building, style its base,
            print it for your shelf.
          </p>
          <div className="hero-ctas reveal">
            <a href={BACK_URL} className="btn btn-light" target="_blank" rel="noopener">
              Back the project <span className="arr">&rarr;</span>
            </a>
            <a href="/studio" className="hero-link">
              Open the Studio
            </a>
          </div>
        </div>
      </section>

      <main className="sheet">
        {/* STORY */}
        <section className="mission light" id="story" data-tone="light">
          <div className="wrap mission-grid">
            <MissionSlides slides={SLIDES} />
            <div className="mission-copy">
              <h2 className="display mission-title reveal">
                One building.
                <br />
                Every detail.
              </h2>
              <div className="mv reveal">
                <h3 className="serif-light">Why FrameBuilding</h3>
                <p>
                  With FrameCity, backers unlocked the stretch goal to print individual buildings, and kept asking
                  for more. FrameBuilding takes that idea all the way: standalone landmarks, modelled from the ground
                  up to stand on their own, on a base you design yourself.
                </p>
                <a href="#process" className="mv-arrow" aria-label="How it works">
                  &rarr;
                </a>
              </div>
              <div className="mv reveal">
                <h3 className="serif-light">Real architecture</h3>
                <p>
                  Every cornice, arch and column is rebuilt by hand into clean, print-ready parts. Never an automatic
                  scan dump. Each model is test-printed until it holds, so the details survive at the size you
                  actually print.
                </p>
                <a href="#library" className="mv-arrow" aria-label="See the library">
                  &rarr;
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* PROCESS */}
        <section className="approach dark" id="process" data-tone="dark">
          <div className="wrap">
            <div className="sec-head">
              <h2 className="display sec-title reveal">How it works.</h2>
              <p className="sec-kicker serif reveal">Pick &middot; Configure &middot; Print</p>
            </div>
            <div className="approach-grid">
              <div className="approach-side">
                <ul className="features">
                  <li className="reveal">
                    <span className="f-icon">
                      <svg viewBox="0 0 32 32">
                        <path d="M9 28V10l8-4v22M17 13h7v15M6 28h21M12 13h2M12 17h2M12 21h2M20 18h1M20 22h1" />
                      </svg>
                    </span>
                    <span>
                      <strong>Hand-modelled</strong>
                      <small>Researched, then rebuilt by hand</small>
                    </span>
                  </li>
                  <li className="reveal">
                    <span className="f-icon">
                      <svg viewBox="0 0 32 32">
                        <path d="M6 22h20v5H6zM9 17h14v5H9zM13 6h6v11h-6z" />
                      </svg>
                    </span>
                    <span>
                      <strong>Configurable</strong>
                      <small>Bases, engraved texts &amp; scale</small>
                    </span>
                  </li>
                  <li className="reveal">
                    <span className="f-icon">
                      <svg viewBox="0 0 32 32">
                        <path d="M5 5h22v22H5zM5 10h22M11 10v6M16 16v8M13 24h6" />
                      </svg>
                    </span>
                    <span>
                      <strong>Print-ready</strong>
                      <small>Tested on Bambu Lab printers</small>
                    </span>
                  </li>
                </ul>
                <p className="approach-text">
                  Every landmark starts in the archive: drawings, site surveys and reference imagery set the
                  proportions before a single polygon is drawn. It is then rebuilt by hand in Blender into clean
                  layers, test-printed on Bambu Lab machines until it holds, and released to the Studio for you to
                  make your own.
                </p>
              </div>
              <HowCarousel steps={STEPS} />
            </div>
          </div>
        </section>

        {/* LIBRARY */}
        <section className="portfolio dark" id="library" data-tone="dark">
          <div className="wrap">
            <div className="sec-head">
              <h2 className="display sec-title reveal">The Library.</h2>
              <div className="sec-aside reveal">
                <p className="pink-serif">Hand-Modelled Landmarks</p>
                <p>
                  We have already modelled more than 200 buildings for FrameCity. FrameBuilding rebuilds the most
                  iconic of them as standalone models, each designed to stand on its own base and hold its detail at
                  any print size, from desk ornament to display piece.
                </p>
              </div>
            </div>
            <div className="pf-grid">
              <article className="pf-card reveal" style={cssVars({ "--c": "#7f7ace" })}>
                <h3 className="serif-light">Launch Landmarks</h3>
                <div className="pf-photo">
                  <img src={`${IMG}/render-lineup-pink.jpg`} alt="The launch landmarks rendered on a pink background" loading="lazy" />
                </div>
                <p>
                  Empire State Building, 70 Pine Street, the Leaning Tower of Pisa, the Sydney Opera House and more,
                  each researched, modelled by hand and test-printed before release.
                </p>
                <div className="pf-more">
                  <div>
                    <p>
                      More landmarks follow after launch. Backers vote on what comes next in our Discord, just as they
                      did for FrameCity&apos;s cities.
                    </p>
                  </div>
                </div>
                <a href="#gallery" className="pink-link">
                  See the renders &rarr;
                </a>
              </article>
              <article className="pf-card reveal" style={cssVars({ "--c": "#6b77cd" })}>
                <h3 className="serif-light">Your Building</h3>
                <div className="pf-photo">
                  <img src={`${IMG}/render-opera.jpg`} alt="Detail of the Sydney Opera House model" loading="lazy" />
                </div>
                <p>
                  Name a building that matters to you, whether it&apos;s your office, your hometown hall or a tower you
                  love, and we will model it to order, to the same standard as every landmark in the library.
                </p>
                <div className="pf-more">
                  <div>
                    <p>
                      Custom buildings are part of the Patron reward, limited to 20 backers. Your building also comes
                      with everything in Merchant.
                    </p>
                  </div>
                </div>
                <a href="#rewards" className="pink-link">
                  Become a Patron &rarr;
                </a>
              </article>
            </div>
          </div>
        </section>

        {/* GALLERY */}
        <section className="magazine light" id="gallery" data-tone="light">
          <div className="wrap">
            <div className="sec-head">
              <h2 className="display sec-title reveal">Made, not generated.</h2>
              <a href={INSTAGRAM_URL} className="archive serif reveal" target="_blank" rel="noopener">
                Follow on Instagram
              </a>
            </div>
            <MagazineScroller
              aside={
                <div className="follow">
                  <p className="sub-title serif">Follow the build as new landmarks are modelled.</p>
                  <p className="follow-text">
                    Join the Amiraé Discord to see work in progress, vote on the next buildings and get first word when
                    the campaign goes live.
                  </p>
                  <a href={DISCORD_URL} className="btn btn-rose" target="_blank" rel="noopener">
                    Join our Discord <span className="arr">&rarr;</span>
                  </a>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="follow-mail">
                    {CONTACT_EMAIL}
                  </a>
                </div>
              }
            >
              {GALLERY.map((g) => (
                <article key={g.title} className="mag-card" style={cssVars({ "--c": g.c })}>
                  <div className="mag-meta">
                    <span className="date">{g.date}</span>
                    <span className="cat">{g.cat}</span>
                  </div>
                  <div className="mag-img">
                    <img src={`${IMG}/${g.src}`} alt={g.alt} loading="lazy" draggable={false} />
                  </div>
                  <h3>{g.title}</h3>
                  <p>{g.text}</p>
                  <a href={g.href} className="pink-link">
                    {g.link} &rarr;
                  </a>
                </article>
              ))}
            </MagazineScroller>
          </div>
        </section>

        {/* REWARDS */}
        <section className="team rewards dark" id="rewards" data-tone="dark">
          <div className="wrap">
            <div className="sec-head">
              <h2 className="display sec-title reveal">Rewards.</h2>
              <p className="sec-aside-text reveal">
                Back FrameBuilding on MakerWorld to unlock the Studio and the full library. Early birds take 30% off
                Architect and Merchant, limited to 100 backers each. Already a FrameCity backer? Sign in with the same
                account; FrameBuilding rewards are separate.
              </p>
            </div>
            <div className="tiers">
              {TIERS.map((t) => (
                <article key={t.name} className="tier reveal" style={cssVars({ "--c": t.c, "--accent": t.accent })}>
                  <div className="tier-art">
                    <img src={`${IMG}/${t.img}`} alt={t.alt} loading="lazy" />
                  </div>
                  <div className="tier-body">
                    <div className="how-top">
                      <span>{t.label}</span>
                      <span>{t.num}</span>
                    </div>
                    <h3 className="serif-light">{t.name}</h3>
                    <p className="tier-pitch">{t.pitch}</p>
                    <ul>
                      {t.perks.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                    <p className="tier-eb">
                      <b>{t.eb[0]}</b> {t.eb[1]}
                    </p>
                    <a href={BACK_URL} className="tier-cta" target="_blank" rel="noopener">
                      Pledge on MakerWorld &rarr;
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="contact faq light" id="faq" data-tone="light">
          <div className="wrap contact-grid">
            <div>
              <h2 className="display sec-title reveal">Questions, answered.</h2>
              <p className="faq-note reveal">
                Can&apos;t find what you need? Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We
                reply within 24 hours.
              </p>
            </div>
            <div className="faq-list">
              {FAQS.map(([q, a], i) => (
                <details key={q} open={i === 0}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section className="locations dark" id="about" data-tone="dark">
          <div className="wrap loc-grid">
            <div className="loc reveal">
              <div className="loc-head">
                <h3 className="serif-light">From the makers of FrameCity</h3>
                <address>
                  Hand-modelled cities in frames
                  <br />
                  USD 18,994+ pledged
                  <br />
                  181+ backers on MakerWorld
                  <br />
                  <br />
                  <a
                    href="https://makerworld.com/en/crowdfunding/313-framecity-high-detailed-cities-in-frames"
                    target="_blank"
                    rel="noopener"
                  >
                    See the campaign &rarr;
                  </a>
                </address>
              </div>
              <div className="loc-card" dangerouslySetInnerHTML={html(art.sf())} />
            </div>
            <div className="loc reveal">
              <div className="loc-head">
                <h3 className="serif-light">Amiraé Studio</h3>
                <address>
                  3D design &amp; fabrication
                  <br />
                  8+ years shaping ideas into objects
                  <br />
                  Madurai, India &middot; Sheridan, WY
                  <br />
                  <br />
                  <a href="https://www.amirae.studio/" target="_blank" rel="noopener">
                    amirae.studio
                  </a>{" "}
                  &middot;{" "}
                  <a href={INSTAGRAM_URL} target="_blank" rel="noopener">
                    Instagram
                  </a>{" "}
                  &middot;{" "}
                  <a href={DISCORD_URL} target="_blank" rel="noopener">
                    Discord
                  </a>
                </address>
              </div>
              <div className="loc-card" dangerouslySetInnerHTML={html(art.madurai())} />
            </div>
          </div>
          <div className="wrap foot">
            <span>&copy; 2026 Amiraé Studio LLC</span>
            <span>FrameBuilding &middot; a MakerWorld crowdfunding project</span>
          </div>
        </section>
      </main>
    </div>
  );
}
