/**
 * Display-only star rating (admin-controlled). Customers cannot change it.
 * Supports fractional values (e.g. 4.8) via a partial-fill overlay.
 */
export function StarRating({
  rating,
  className = "text-base",
}: {
  rating: number;
  className?: string;
}) {
  const safe = Math.max(0, Math.min(5, Number(rating) || 0));
  const pct = (safe / 5) * 100;
  return (
    <span
      role="img"
      aria-label={`Rated ${safe.toFixed(1)} out of 5 stars`}
      className={`relative inline-block whitespace-nowrap leading-none select-none ${className}`}
    >
      <span className="text-muted-foreground/30" aria-hidden="true">
        ★★★★★
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden text-gold"
        style={{ width: `${pct}%` }}
      >
        ★★★★★
      </span>
    </span>
  );
}
