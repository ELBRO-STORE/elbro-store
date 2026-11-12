# ELBRO STORE — Corrected SQL migrations (review draft)

## Important before running
- These files are intended for a **fresh staging Supabase project**, applied in order from `001` through `011`.
- Do not overwrite or re-run edited historical migrations on a database where those migration versions have already been applied. For an existing database, create a new forward-only migration after comparing the live schema.
- No connection to your Supabase project was available here, and these SQL files have not been executed against PostgreSQL or a live Supabase staging database. Treat this as a reviewed correction bundle, not as proof of production readiness.
- Take a database backup and test the complete checkout, admin, coupon, wishlist, review, storage and cancellation flows in staging before production.

## What was corrected
- Removed the redundant product slug/order reference indexes and strengthened defaults/constraints.
- Added variant/product consistency validation for order items.
- Added non-recursive admin helper functions and replaced recursive `admin_users` RLS checks.
- Restricted public settings reads to the explicit store-public allowlist.
- Replaced the broken product-filter function with a static filtered query.
- Removed the unsafe legacy order-creation function; migration 008 creates the secured RPC.
- Secured order creation: identity comes from `auth.uid()`, prices and delivery fee are read server-side, products must be published, variants are validated, stock is reserved atomically, and cancelled orders restore stock.
- Backfill/linking requires exact non-empty email plus matching phone; it does not link by phone alone.
- Removed the active destructive rollback block from migration 008.
- Fixed coupon parameter ordering and early-return behavior; coupon discounts and usage are recalculated/recorded server-side during order creation.
- Secured wishlist RPCs against cross-user access and fixed NULL-variant uniqueness.
- Fixed review profile join, verified-purchase trust, row-count types, and duplicate general reviews.
- Added public product-image bucket policies.

## Frontend changes still required before end-to-end testing
1. `src/pages/Checkout.tsx`: the current code sends `appliedCoupon?.code` as `coupon_id`. The database expects the coupon UUID. Send `appliedCoupon?.id` (and ensure the applied-coupon type includes `id`).
2. `src/services/orders.ts`: guest orders are intentionally not readable by direct table SELECT. Use the new RPCs:
   - After `create_order` returns an order UUID, call `get_order_after_create` with `p_order_id` and the checkout phone.
   - For later tracking, call `get_order_for_tracking` with `p_order_ref` and the checkout phone.
   The existing `getOrder(orderRef)` signature must be extended to accept the phone, or obtain the authenticated user's phone safely.
3. `create_order` ignores the client-supplied delivery fee and uses `store_settings.delivery_fee_cents` and `free_delivery_from_cents`. Keep those settings accurate in the admin database.
4. The seed row for `ELBRO PREMIUM OUTFIT` has `price_cents = 49900` and `sale_price_cents = 69900` (sale higher than base). The order RPC ignores a sale price unless it is lower than the base price, so checkout uses 49900. Verify the intended display price in the frontend before launch.

## Supabase storage
Migration 005 creates/updates the public `product-images` bucket and policies for public reads and admin writes. If your app uses a different bucket name, update the SQL and frontend upload path together.

## Suggested staging verification
- Apply all 11 files in order on a fresh staging project.
- Verify an anonymous guest order and an authenticated order.
- Verify a wrong user cannot read another user's order.
- Verify guest tracking fails with a wrong phone and succeeds with the correct phone.
- Verify stock decreases on order creation and is restored on cancellation exactly once.
- Verify a forged client price/delivery fee/discount is ignored.
- Verify coupon expiration, total/per-user limits, product/category restrictions, and atomic usage counting.
- Verify wishlist isolation, NULL variant behavior, review ownership, and verified-purchase status.
- Verify admin RLS and product-image uploads.
