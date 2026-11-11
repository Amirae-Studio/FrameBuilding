import Link from "next/link";
import { Logo } from "./Logo";

/**
 * Paper header shared by the Studio picker, sign-in and account pages:
 * a square back control on the left, the logo centred, actions on the right.
 * tone="sky" makes it transparent with light ink, for pages on the hero sky.
 */
export function PageHeader({
  back = { href: "/", label: "Back to site" },
  tone = "paper",
  children,
}: {
  back?: { href: string; label: string };
  tone?: "paper" | "sky";
  children?: React.ReactNode;
}) {
  return (
    <header className={`fb-head${tone === "sky" ? " fb-head-sky" : ""}`}>
      <div className="flex min-w-0 items-center">
        <Link href={back.href} className="fb-square">
          <span aria-hidden>&larr;</span>
          <span className="hidden sm:inline">{back.label}</span>
        </Link>
      </div>
      <Link href="/" aria-label="FrameBuilding home" className="fb-head-logo justify-self-center no-underline">
        <Logo className="text-[22px] md:text-[27px]" />
      </Link>
      <div className="flex min-w-0 items-center justify-end gap-[10px]">{children}</div>
    </header>
  );
}
