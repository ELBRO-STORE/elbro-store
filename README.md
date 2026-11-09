# ELBROA — Order Management System

## 1. Summary of what was built

Your Blogger site keeps its exact design and every existing feature. On
top of it, a small Google Apps Script backend now:

- Receives every order placed at checkout, validates it, **recalculates
  the price itself** (never trusts the browser), blocks duplicate
  submissions, writes it to a Google Sheet, and emails you a
  notification — all without any API key living in the Blogger HTML.
- Answers "where's my order?" lookups (Order Tracking page) with the
  real status from the Sheet.
- Powers a separate, passkey-protected **Admin Dashboard** page with
  today's orders/sales, total revenue, top products, pending/delivered/
  cancelled counts, and a searchable/filterable order list where you can
  change an order's status.
- Is built so a future AI agent can call the same backend actions
  (see the note at the bottom of `Code.gs`) without any redesign.

## 2. Files changed / added

| File | What it is |
|---|---|
| `google-apps-script/Code.gs` | New — the entire backend (Sheets + validation + admin API). |
| `google-apps-script/README-DEPLOY.md` | New — Sheet + Apps Script setup and deployment steps. |
| `elbroa-frontend-patch.md` | Patch instructions for your existing Blogger HTML — 6 small, exact find/replace edits (API URL + helper, disable old Google Form/EmailJS path, add `productId` to order lines, send orders to the new API, real Order Tracking). No CSS, layout, or product/cart logic is touched. |
| `admin-dashboard.html` | New — standalone dashboard page in the ELBROA visual style (same fonts, colors, buttons, card style). |

## 3. Exact code

- Backend: `google-apps-script/Code.gs`
- Frontend edits: `elbroa-frontend-patch.md` (6 patches, each shows the
  exact existing code to find and what to put next to it)
- Dashboard: `admin-dashboard.html`

## 4. Installing on Blogger

1. Follow `google-apps-script/README-DEPLOY.md` fully first (Sheet →
   Apps Script → passkey → deploy → get the `/exec` URL). Do this
   before touching Blogger.
2. In Blogger, open the HTML view of the page containing your ELBROA
   site's code.
3. Apply the 6 edits from `elbroa-frontend-patch.md` one at a time,
   pasting in your real `/exec` URL where indicated.
4. Save/publish the page and reload it once to confirm nothing broke
   visually (see Testing below).
5. Host `admin-dashboard.html` as its own **separate, unlisted Blogger
   page** (Blogger → Pages → New page → HTML view → paste the file's
   content, paste your `/exec` URL into `API_URL`). Don't link to it
   from the site's navigation — treat the URL itself as the access
   control (see Security below).

## 5. How to test a new order

1. Open the live site, add a product to the bag, go to Checkout, fill
   the form, and place the order.
2. You should see a green confirmation with an order ID like
   `ELB-2026-00001`.
3. Check: the Google Sheet's `Orders` tab has a new row; your
   `NOTIFY_EMAIL` inbox got a notification email; WhatsApp still opens
   as before.
4. Try submitting the exact same order twice quickly (e.g. double-click
   "Confirmer la Commande" or refresh and resubmit before the redirect)
   — the Sheet should only ever get **one** row for it, because of the
   idempotency key.
5. Try submitting with an invalid email or a 3-digit phone number — it
   should be rejected with a clear message and nothing should reach the
   Sheet.

## 6. How to test Order Tracking

1. Take an `orderId` from a row in the Sheet, and the email or phone
   from that same row.
2. Go to the site's Order Tracking page, enter both, submit.
3. You should see the real status pulled from the Sheet. Change the
   status for that order from the Admin Dashboard, then track again —
   it should reflect the update.
4. Try a real order ID with the *wrong* email/phone — it should refuse
   to show the order (this is the privacy gate, see Security below).

## 7. Accessing the Admin Dashboard

- Open the unlisted Blogger page you created for `admin-dashboard.html`.
- Enter the `ADMIN_PASSKEY` you set in Apps Script Script Properties.
- From there: KPIs, top products, and the full order list with search,
  status filter, and inline status changes.

## 8. Limitations & security considerations

- **Passkey, not full auth.** The admin passkey has no sessions, no
  per-person accounts, no rate limiting, and no expiry. It's fine for
  one or a few trusted people; if this grows, add Google OAuth to the
  dashboard instead.
- **Unlisted ≠ private.** The dashboard page and the `/exec` API URL
  are both reachable by anyone who has the link, even if not linked
  from your nav. Don't post the dashboard URL publicly, and rotate the
  passkey if you think it leaked.
- **No secrets in Blogger.** The only thing pasted into the Blogger
  HTML is the `/exec` URL, which is not sensitive on its own — every
  meaningful action behind it still requires either passing the
  server-side validation (orders) or the passkey (admin actions).
- **Pricing integrity.** The server is the source of truth for prices
  (`PRICE_TABLE` in `Code.gs`). If you change a price on the site, you
  must update `PRICE_TABLE` too, or the order total will be computed
  from the old price.
- **Email sending quota.** `MailApp.sendEmail` runs under your Google
  account's daily quota (100/day on a free Gmail account, more on
  Workspace). Fine for a small shop; monitor if order volume grows.
- **Apps Script isn't instant.** Cold starts and Sheet I/O add roughly
  1-2 seconds to checkout and tracking — acceptable for this scale, but
  not sub-second.
- **Discounts.** The coupon/discount shown in the cart UI is not yet
  re-validated server-side (the backend currently computes
  subtotal + shipping only). If you want coupons enforced server-side
  too, that's a small addition to `createOrder` in `Code.gs` — flag it
  if you want it built next.
