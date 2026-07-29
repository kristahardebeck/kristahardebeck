export function currency(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** Axis / tile shorthand: $1.5M, $487K, $186 */
export function currencyCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const m = n / 1_000_000;
    return `$${m.toFixed(m >= 10 ? 1 : 2).replace(/\.?0+$/, "")}M`;
  }
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

export function percent(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function count(n: number): string {
  return n.toLocaleString("en-US");
}

/** Signed relative change, e.g. "+14.3%" */
export function delta(current: number, prior: number): string {
  if (prior === 0) return "—";
  const change = (current - prior) / prior;
  const sign = change >= 0 ? "+" : "−";
  return `${sign}${(Math.abs(change) * 100).toFixed(1)}%`;
}

/**
 * Whether a change should read as good. `lowerIsBetter` flips it for metrics
 * like cost-to-raise-a-dollar, where a decrease is the win.
 */
export function isImprovement(
  current: number,
  prior: number,
  lowerIsBetter = false,
): boolean {
  return lowerIsBetter ? current < prior : current > prior;
}

export function formatByKind(
  n: number,
  kind: "currency" | "percent" | "number" | "currency-precise",
): string {
  switch (kind) {
    case "currency":
      return currencyCompact(n);
    case "currency-precise":
      return `$${n.toFixed(2)}`;
    case "percent":
      return percent(n);
    case "number":
      return count(n);
  }
}
