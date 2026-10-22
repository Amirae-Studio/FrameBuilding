/**
 * Heritage mark — a pediment triangle (the classical roofline) with a
 * wide-tracked wordmark. Drawn in currentColor so it follows the theme.
 */
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
      className={`inline-flex items-center gap-3 text-cream ${className}`}
      aria-label="Heritage"
    >
      <svg
        viewBox="0 0 28 26"
        className="h-[1.15em] w-auto shrink-0"
        fill="none"
        aria-hidden
      >
        <path
          d="M14 2 26 22H2L14 2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M8.5 22v-5M14 22V11M19.5 22v-5" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {withWord && (
        <span className="wordmark text-[0.72em] leading-none !pl-0 tracking-[0.34em]">
          Heritage
        </span>
      )}
    </span>
  );
}
