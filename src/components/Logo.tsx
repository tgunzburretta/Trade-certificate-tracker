/** The Vetted mark: a shield with a checkmark, filled for legibility down to favicon size. */
export function LogoMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <polygon points="14,10 50,10 54,30 32,58 10,30" fill="#0f172a" />
      <path
        d="M22 32 L29 40 L44 20"
        fill="none"
        stroke="#ffffff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  size = 22,
  wordmarkClassName = "text-lg font-semibold tracking-tight text-slate-900",
  suffix,
}: {
  size?: number;
  wordmarkClassName?: string;
  suffix?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className={wordmarkClassName}>
        Vetted
        {suffix && <span className="text-slate-400"> {suffix}</span>}
      </span>
    </span>
  );
}
