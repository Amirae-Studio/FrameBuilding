import Link from "next/link";
import { Logo } from "./Logo";

/**
 * Paper header shared by the Studio picker, sign-in and account pages:
 * a square back control on the left, the logo centred, actions on the right.
 */
export function PageHeader({
  back = { href: "/", label: "Back to site" },
  children,
}: {
  back?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <header className="fb-head">
      <div className="flex min-w-0 items-center">
        <Link href={back.href} className="fb-square">
          <span aria-hidden>&larr;</span>
          <span className="hidden sm:inline">{back.label}</span>
        </Link>
      </div>
      <Link href="/" aria-label="FrameBuilding home" className="justify-self-center text-ink no-underline">
        <Logo className="text-[22px] md:text-[27px]" />
      </Link>
      <div className="flex min-w-0 items-center justify-end gap-[10px]">{children}</div>
    </header>
  );
}
