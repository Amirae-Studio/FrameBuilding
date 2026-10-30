/**
 * FrameBuilding mark — a tower set inside an open frame on a plinth, with the
 * "Frame" light / "Building" heavy wordmark. Frame and plinth draw in
 * currentColor so they follow the theme; the tower stays rose.
 */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M26 15.75H9.75v44.5h44.5v-44.5H38"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path fill="#d97f92" d="M31.1 12h1.8L32 1.5zM29.5 12h5v8h-5zM26.5 20h11v8h-11zM23 28h18v25.7H23z" />
      <rect x="17" y="54.5" width="30" height="4" fill="currentColor" />
    </svg>
  );
}

export function Logo({
  className = "",
  withWord = true,
}: {
  className?: string;
  priority?: boolean;
  withWord?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-[0.35em] text-cream ${className}`}
      aria-label="FrameBuilding"
    >
      <LogoMark className="-mt-[0.12em] h-[1.2em] w-auto shrink-0" />
      {withWord && (
        <span className="fb-wordmark">
          Frame<em>Building</em>
        </span>
      )}
    </span>
  );
}
