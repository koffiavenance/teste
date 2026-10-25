import { z } from "zod";
import { orderTotals, type Bundle, type ShippingRule } from "@/lib/pricing";

// E.164 : +225XXXXXXXXXX (indicatif + 8 à 12 chiffres)
const phone = z.string().trim().regex(/^\+\d{9,15}$/, "Numéro invalide");

export const CheckoutInput = z.object({
  productId: z.string().uuid(),
  bundleQty: z.number().int().min(1).max(20),
  fullName: z.string().trim().min(2).max(80),
  phone,
  city: z.string().trim().min(2).max(60),
  addressHint: z.string().trim().max(200).optional(),
  website: z.string().max(0).optional(), // honeypot : doit rester vide
});

export async function POST(req: Request) {
  const parsed = CheckoutInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 });
  }
  const input = parsed.data;
  if (input.website) return Response.json({ ok: true }); // bot : on fait semblant

  // TODO(db): charger produit + shop ; refuser si shop.status !== 'active' (mode prévisualisation)
  // TODO(db): rate-limit IP (Redis) + anti-doublon (même phone+produit < 10 min)
  // TODO(db): le prix vient TOUJOURS de la base, jamais du client.
  const unitPrice = 15000; // placeholder
  const bundle: Bundle = { qty: input.bundleQty, discount_pct: input.bundleQty === 2 ? 10 : input.bundleQty >= 3 ? 15 : 0 };
  const rule: ShippingRule = { flat: 1500, freeAbove: 30000 };
  const totals = orderTotals(unitPrice, bundle, input.city, rule);

  // TODO(db): insert orders + order_events(null→new) ; supprimer l'abandoned_cart correspondant
  // TODO(queue): notifier le confirmateur (WhatsApp/push)
  return Response.json({ ok: true, totals }, { status: 201 });
}
