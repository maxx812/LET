import { cn } from "@/lib/utils";

type Props = {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  className?: string;
  trackClass?: string;
  barClass?: string;
  children?: React.ReactNode;
};

export function CircularProgress({
  value,
  size = 220,
  stroke = 14,
  className,
  trackClass = "stroke-secondary",
  barClass = "stroke-accent",
  children,
}: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, value)));

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={trackClass}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={cn("transition-[stroke-dashoffset] duration-700 ease-out", barClass)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
