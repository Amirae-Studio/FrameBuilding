/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Tier } from "../lib/access";
import type { NavUser } from "../lib/user";
import type { getUserDownloadStats } from "../app/actions/downloads";
import { PageHeader } from "./PageHeader";
import { SignOutButton } from "./SignOutButton";
import { UpgradeTierModal } from "./UpgradeTierModal";

type DownloadStats = NonNullable<Awaited<ReturnType<typeof getUserDownloadStats>>>;

// Same card colours as the landing page's reward tiers
const TIERS: Record<Tier, { title: string; label: string; num: string; pitch: string; c: string; accent: string }> = {
  explorer: {
    title: "Explorer",
    label: "EXPLORER",
    num: "00",
    pitch: "Up to 25 downloads every month.",
    c: "#6468ab",
    accent: "#c4c9ff",
  },
  architect: {
    title: "Architect",
    label: "TIER I",
    num: "01",
    pitch: "Lifetime access · unlimited downloads.",
    c: "#8f3b4b",
    accent: "#f6c6b0",
  },
  merchant: {
    title: "Merchant",
    label: "TIER II",
    num: "02",
    pitch: "Commercial licence · unlimited downloads.",
    c: "#28346f",
    accent: "#b8c8ff",
  },
  studio: {
    title: "Merchant",
    label: "TIER II",
    num: "02",
    pitch: "Commercial licence · unlimited downloads.",
    c: "#28346f",
    accent: "#b8c8ff",
  },
};

const cssVars = (v: Record<string, string>) => v as React.CSSProperties;

export function AccountView({
  user,
  hasAccess,
  tierKey,
  redeemedCode,
  redeemedOn,
  stats,
}: {
  user: NavUser;
  hasAccess: boolean;
  tierKey: Tier | null;
  redeemedCode: string | null;
  redeemedOn: string | null;
  stats: DownloadStats | null;
}) {
  const tier = hasAccess && tierKey ? TIERS[tierKey] : null;
  const isMerchant = hasAccess && (tierKey === "merchant" || tierKey === "studio");
  const isExplorer = stats?.tier === "explorer";

  return (
    <div className="flex min-h-dvh flex-col bg-base">
      <PageHeader>
        <SignOutButton />
      </PageHeader>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-[22px] py-14 md:px-16 md:py-24">
        {/* Identity */}
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="flex min-w-0 items-center gap-6">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-[72px] w-[72px] shrink-0 border-[1.5px] border-[#241b4f] object-cover shadow-[3px_3px_0_#241b4f]"
              />
            ) : (
              <span className="grid h-[72px] w-[72px] shrink-0 place-items-center border-[1.5px] border-[#241b4f] bg-[#f6d27a] font-display text-[30px] text-[#241b4f] shadow-[3px_3px_0_#241b4f]">
                {user.initial}
              </span>
            )}
            <div className="min-w-0">
              <div className="fb-eyebrow mb-3">Your account</div>
              <h1 className="fb-display m-0 truncate text-[clamp(38px,5.5vw,64px)] text-ink">{user.name}.</h1>
              <p className="m-0 mt-3 truncate font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a8492]">
                {user.email}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-[10px]">
            {hasAccess && tierKey && !isMerchant && <UpgradeTierModal currentTier={tier?.title || tierKey} />}
            <Link href="/studio" className="fb-btn fb-btn-rose">
              {hasAccess ? "Open the Studio" : "Enter access code"} <span className="arr">&rarr;</span>
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-[30px] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Access / tier card */}
          <article
            className="fb-card flex flex-col px-7 pb-10 pt-5"
            style={cssVars(
              tier
                ? { "--c": tier.c, "--strip": tier.accent }
                : { "--c": "#8b84cc", "--strip": "#a3a4e4" }
            )}
          >
            <div className="fb-card-top">
              <span>{tier ? tier.label : "STUDIO ACCESS"}</span>
              <span>{tier ? tier.num : "—"}</span>
            </div>
            <h2 className="fb-serif-light m-0 mt-10 text-[44px] leading-none text-[#fbf2ee]">
              {tier ? tier.title : "Not unlocked yet"}
            </h2>
            <p className="m-0 mt-2 font-display text-[16px]" style={{ color: tier?.accent ?? "#f6eaea" }}>
              {tier ? tier.pitch : "Enter your access code to open the Studio."}
            </p>

            <p className="m-0 mt-8 font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/70">
              <b
                className="mr-2 inline-block px-2 py-1 font-normal text-[#241b4f]"
                style={{ background: tier?.accent ?? "#f6eaea" }}
              >
                {hasAccess ? "Unlocked" : "Locked"}
              </b>
              {hasAccess && redeemedOn ? `Redeemed ${redeemedOn}` : hasAccess ? "Studio access active" : "View only"}
            </p>

            {hasAccess && redeemedCode && (
              <div className="mt-auto flex items-center justify-between border-t border-white/20 pt-5 text-[12px]">
                <span className="font-light text-white/70">Redeemed code</span>
                <span className="font-mono text-[10px] tracking-[0.2em] text-white">{redeemedCode}</span>
              </div>
            )}
          </article>

          {/* Downloads */}
          <section className="fb-sheet px-7 pb-8 pt-6">
            <div className="flex items-baseline gap-3 border-b border-[var(--line-light)] pb-5">
              <span className="font-mono text-[10px] text-rose-ink">01</span>
              <h2 className="fb-serif-light m-0 flex-1 text-[36px] leading-none text-ink">Downloads</h2>
              {stats && !isExplorer && (
                <span className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#2f7a6c]">Unlimited</span>
              )}
            </div>

            {!stats ? (
              <p className="fb-hint m-0 mt-6">Your download quota appears here once the Studio is unlocked.</p>
            ) : (
              <>
                <div className="mt-6 grid grid-cols-2 gap-px border border-[var(--line-light)] bg-[var(--line-light)]">
                  <div className="bg-paper px-4 pb-3.5 pt-4">
                    <b className="fb-display block text-[32px] font-extrabold text-ink">
                      {stats.monthlyCount}
                    </b>
                    <span className="mt-2 block font-mono text-[7.5px] uppercase tracking-[0.18em] text-[#8a8492]">
                      Used this cycle
                    </span>
                  </div>
                  <div className="bg-paper px-4 pb-3.5 pt-4">
                    <b className="fb-display block text-[32px] font-extrabold text-ink">
                      {isExplorer ? stats.remaining : "∞"}
                      {isExplorer && (
                        <small className="ml-1 font-display text-[15px] font-light tracking-normal text-[#5d5758]">
                          / 25
                        </small>
                      )}
                    </b>
                    <span className="mt-2 block font-mono text-[7.5px] uppercase tracking-[0.18em] text-[#8a8492]">
                      {isExplorer ? "Left this cycle" : "Downloads left"}
                    </span>
                  </div>
                </div>

                {isExplorer && (
                  <div className="mt-6">
                    <div className="relative h-[3px] bg-[#ececf2]">
                      <span
                        className="absolute inset-y-0 left-0 bg-rose transition-[width] duration-500"
                        style={{ width: `${Math.min(100, (stats.monthlyCount / 25) * 100)}%` }}
                      />
                    </div>
                    <p className="fb-hint m-0 mt-3">Resets on {stats.resetDate}</p>
                  </div>
                )}

                <div className="mb-3 mt-8 flex items-center justify-between">
                  <span className="fb-label">Recent downloads</span>
                </div>
                {stats.recentDownloads.length === 0 ? (
                  <p className="fb-hint m-0">Nothing downloaded yet.</p>
                ) : (
                  <ul className="m-0 grid max-h-[240px] list-none gap-2 overflow-y-auto p-0">
                    {stats.recentDownloads.map((dl) => (
                      <li
                        key={dl.id}
                        className="flex items-center justify-between gap-4 border border-[var(--line-light)] bg-white px-4 py-3"
                      >
                        <span className="min-w-0 truncate font-display text-[16px] capitalize text-ink">
                          {dl.locationSlug.replace(/-/g, " ")}
                          <span className="ml-2 font-mono text-[7.5px] uppercase tracking-[0.16em] text-rose-ink">
                            {dl.citySlug.replace(/-/g, " ")}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] text-[#8a8492]">
                          {new Date(dl.downloadedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </div>

        {/* Merchant assets & commercial licence */}
        {isMerchant && (
          <section className="mt-[30px]">
            <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <h2 className="fb-display m-0 text-[clamp(34px,4vw,52px)] text-ink">Merchant assets.</h2>
              <p className="m-0 max-w-[360px] text-[13px] font-light leading-[1.45] text-[#5d5758] md:text-right">
                As a FrameBuilding Merchant you may print and sell physical models. Download your official
                badge and licence below.
              </p>
            </div>
            <div className="grid gap-[30px] sm:grid-cols-2">
              {[
                {
                  href: "/api/badge/download",
                  file: "FrameBuilding_Merchant_Badge.png",
                  label: "BADGE",
                  num: "01/02",
                  title: "Merchant badge",
                  body: "Badge artwork for your shop, website or social listings.",
                  c: "#d5738b",
                },
                {
                  href: "/api/license/download",
                  file: "FrameBuilding_Commercial_License.pdf",
                  label: "LICENCE",
                  num: "02/02",
                  title: "Commercial licence",
                  body: "PDF certificate confirming your right to sell what you print.",
                  c: "#8b84cc",
                },
              ].map((a) => (
                <a
                  key={a.href}
                  href={a.href}
                  download={a.file}
                  className="fb-card group block px-6 pb-8 pt-[18px] no-underline transition-transform duration-500 hover:-translate-y-1.5"
                  style={cssVars({ "--c": a.c })}
                >
                  <div className="fb-card-top">
                    <span>{a.label}</span>
                    <span>{a.num}</span>
                  </div>
                  <h3 className="fb-serif-light m-0 mt-6 text-[38px] leading-none text-[#f5ecec]">{a.title}</h3>
                  <p className="m-0 mt-3 max-w-[300px] text-[12px] font-light leading-[1.4] text-white/75">{a.body}</p>
                  <span className="mt-5 inline-block text-[13px] text-white transition-[letter-spacing] duration-300 group-hover:tracking-[0.03em]">
                    Download &rarr;
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
