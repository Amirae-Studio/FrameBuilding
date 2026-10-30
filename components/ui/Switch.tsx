// components/ui/Switch.tsx

export interface SegmentedToggleProps {
  label?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export default function SegmentedToggle({
  label,
  checked,
  onCheckedChange,
  disabled = false,
  className = "",
}: SegmentedToggleProps) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      {label && <span className="text-[14px] text-cream">{label}</span>}
      <div className="flex items-center gap-[3px] border border-cream/15 bg-panel p-[3px]">
      <button
          type="button"
          disabled={disabled}
          onClick={() => onCheckedChange(false)}
          className={`h-[28px] px-3 font-mono text-[8.5px] uppercase tracking-[0.12em] transition-colors ${
            !checked
              ? "bg-cream/[0.12] text-cream"
              : "text-[#8a8492] hover:text-cream"
          }`}
        >
          OFF
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onCheckedChange(true)}
          className={`h-[28px] px-3 font-mono text-[8.5px] uppercase tracking-[0.12em] transition-colors ${
            checked
              ? "bg-rose text-white"
              : "text-[#8a8492] hover:text-cream"
          }`}
        >
          ON
        </button>
        
      </div>
    </div>
  );
}