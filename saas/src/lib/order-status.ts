export type OrderStatus =
  | "new" | "confirmed" | "to_ship" | "shipping" | "delivered"
  | "unreachable" | "scheduled" | "returned" | "delivery_failed" | "cancelled";

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new:             ["confirmed", "unreachable", "scheduled", "cancelled"],
  unreachable:     ["confirmed", "scheduled", "cancelled"],
  scheduled:       ["confirmed", "cancelled"],
  confirmed:       ["to_ship", "unreachable", "cancelled"],
  to_ship:         ["shipping", "cancelled"],
  shipping:        ["delivered", "delivery_failed", "returned"],
  delivery_failed: ["shipping", "returned", "cancelled"],
  delivered:       [],
  returned:        [],
  cancelled:       [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Compteurs « À traiter » du dashboard. */
export const TODO_BUCKETS = {
  to_confirm: ["new"],
  to_ship: ["to_ship"],
  unreachable: ["unreachable"],
  scheduled: ["scheduled"],
  shipping: ["shipping"],
} as const satisfies Record<string, OrderStatus[]>;
