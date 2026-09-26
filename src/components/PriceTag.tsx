/** Selling price with a slightly smaller ₹ symbol and tabular numerals. */
export function PriceTag({ amount, className = "" }: { amount: number; className?: string }) {
  return (
    <span className={`tnum font-bold ${className}`}>
      <span className="text-[0.8em]">₹</span>
      {amount.toLocaleString("en-IN")}
    </span>
  );
}
