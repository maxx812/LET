import { useEffect, useState } from "react";

/**
 * Animated number that counts toward `value` over `duration` ms.
 * Uses requestAnimationFrame; cleans up on unmount.
 */
export function AnimatedNumber({
  value,
  duration = 700,
  format = (n: number) => n.toLocaleString("en-IN"),
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const start = display;
    const delta = value - start;
    if (delta === 0) return;
    const t0 = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + delta * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
}
