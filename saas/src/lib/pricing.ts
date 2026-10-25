export interface Bundle {
  qty: number;
  discount_pct: number;
  badge?: "popular" | "best";
}

/** Pourcentage de réduction affiché (ex: -25 %). 0 si pas de prix barré valide. */
export function discountPercent(price: number, compareAt?: number | null): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/** Sous-total d'un pack : qty × prix unitaire, remise du pack appliquée, arrondi à l'unité. */
export function bundleSubtotal(unitPrice: number, bundle: Bundle): number {
  return Math.round(unitPrice * bundle.qty * (1 - bundle.discount_pct / 100));
}

export interface ShippingRule {
  flat: number;
  freeAbove?: number;
  byCity?: Record<string, number>;
}

export function shippingFee(subtotal: number, city: string, rule: ShippingRule): number {
  if (rule.freeAbove !== undefined && subtotal >= rule.freeAbove) return 0;
  return rule.byCity?.[city.trim().toLowerCase()] ?? rule.flat;
}

export function orderTotals(unitPrice: number, bundle: Bundle, city: string, rule: ShippingRule) {
  const subtotal = bundleSubtotal(unitPrice, bundle);
  const shipping = shippingFee(subtotal, city, rule);
  return { subtotal, shipping, total: subtotal + shipping };
}
