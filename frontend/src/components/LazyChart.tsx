import { useEffect, useRef, useState, type ReactNode } from "react";

interface LazyChartProps {
  children: ReactNode;
  height?: number | string;
  className?: string;
  /** Margin around the root for pre-loading. Default: "200px" */
  rootMargin?: string;
  /** Placeholder shown before chart enters viewport */
  placeholder?: ReactNode;
}

/**
 * LazyChart: Only renders chart content when it enters the viewport.
 * Uses Intersection Observer to detect visibility.
 * Reduces initial render cost for pages with many charts.
 */
export function LazyChart({
  children,
  height = 300,
  className = "",
  rootMargin = "200px",
  placeholder,
}: LazyChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  const style = typeof height === "number" ? { minHeight: `${height}px` } : { minHeight: height };

  return (
    <div ref={ref} className={className} style={style}>
      {isVisible ? (
        children
      ) : (
        placeholder || (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-muted-foreground/20 border-t-muted-foreground/60 rounded-full animate-spin" />
              <span>加载图表中...</span>
            </div>
          </div>
        )
      )}
    </div>
  );
}
