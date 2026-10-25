import { test } from "node:test";
import assert from "node:assert/strict";
import { discountPercent, bundleSubtotal, orderTotals } from "./pricing.ts";
import { canTransition } from "./order-status.ts";

test("réduction -25 %", () => assert.equal(discountPercent(15000, 20000), 25));
test("pas de prix barré", () => assert.equal(discountPercent(15000, null), 0));
test("pack de 2 à -10 %", () => assert.equal(bundleSubtotal(10000, { qty: 2, discount_pct: 10 }), 18000));
test("livraison gratuite au-dessus du seuil", () =>
  assert.deepEqual(orderTotals(10000, { qty: 3, discount_pct: 15 }, "Abidjan", { flat: 1500, freeAbove: 20000 }),
    { subtotal: 25500, shipping: 0, total: 25500 }));
test("transitions", () => {
  assert.ok(canTransition("new", "confirmed"));
  assert.ok(!canTransition("delivered", "new"));
});
