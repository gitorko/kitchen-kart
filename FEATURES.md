# Kitchen Kart — Features

A home-kitchen ordering app: kitchens (house wives) list dishes, neighbors browse and order, kitchens accept/deliver, payment happens over UPI.

## Accounts & login

- **Login is apartment number + 4-digit PIN** — not phone/email. Phone is still captured at signup for contact purposes, but never used to sign in.
- **Signup**: name, phone, apartment number, PIN. Creates a `pending` account and issues a short CODE + shareable link (`/?approve=CODE`), with a one-tap WhatsApp share button.
- **Apartment turnover**: signing up with a apartment number that already has an account prompts "are you the new owner/tenant?" — confirming lets the signup proceed as a pending replacement. On approval, the old resident's account (and their kitchen + dishes, if they ran one) is deleted; order history is kept.
- **Approvals**: only an admin, or any *approved kitchen* (kitchens are "low-level admins"), can approve/reject pending signups. Rejections can include a reason. Every decision is logged permanently in an approval history.
- **Forgot PIN**: request a reset from the login screen (new PIN + apartment number) — issues a CODE the same way signup does. The **old PIN keeps working** until an admin/kitchen approves the reset; approving swaps in the new PIN, rejecting discards the request.
- **Bootstrap admin**: a single env-configured identity (`ADMIN_APARTMENT` / `ADMIN_PIN`) with no real apartment, typed into the same login field. Not a database row.
- **Admin impersonation**: from a "Users" tab, admin can sign in as any approved user (short-lived token) to see the app exactly as they would — with a "Viewing as…" banner and one-click return to their own session.

## Browsing (public, no login required)

- Home page lists all dishes, or lets you browse kitchen-by-kitchen.
- **Search** matches dish or kitchen name, and **groups results by dish name** so it's obvious when multiple kitchens make the same thing (with a "N kitchens have this" badge) — lets you compare price at a glance.
- **Hearts** — anyone signed in can heart a dish (social "support" signal, public count shown); hearted dishes are pinned to the top of listings.
- **Kitchen favorites** — same idea for kitchens: star a kitchen to pin it to the top of "Browse by Kitchen."
- **Dish sharing** — every dish card has a one-tap WhatsApp share button that deep-links (`/?dish=ID`) straight to that dish, even for someone who's never opened the app.
- Login is only required to actually place an order (or to heart/favorite) — browsing, searching, and building a cart all work while signed out.

## Ordering

- Cart is scoped **per kitchen** — you can build separate carts across multiple kitchens simultaneously, each checked out independently.
- Per-item **comments to the chef** (e.g. "less salt").
- Checkout requires login (prompts sign-in if needed); cart survives the detour.
- Orders flow: `placed` → kitchen `accept`s or `reject`s → kitchen marks `delivered`.
- **UPI payment**: generates a `upi://pay` deep link and a scannable QR from the kitchen's UPI ID and the order total; either side can mark the order `paid` once money has actually changed hands (manual — no payment gateway).
- Customers get a full order history with live status/payment badges.

## Dish availability

Each dish has an independent stock/visibility model, not a single flag:

- **Availability schedule** — a dish is either "On the Spot" (always listed, kitchen just toggles as they go), a **one-off date** (with optional time), or a **weekly recurring** pattern (pick specific weekdays). Dishes outside their scheduled day stay listed (for discovery) but ordering is disabled with a "Not available today" note.
- **In Stock / Out of Stock** — the "sold out" toggle. Out-of-stock dishes **stay visible** to customers (greyed out, marked), so people can see what's normally offered.
- **Available / Currently Not Available** — a separate hide/show toggle. Setting a dish to "Currently Not Available" removes it from customer browsing entirely; the kitchen still sees and manages it from their own dashboard.
- Kitchen owners can delete a dish outright at any time.

## Kitchen management

- Kitchen setup: name, UPI ID, description, photo (crop-on-upload).
- **Vacation mode** — "Go On Vacation" stops all new orders for that kitchen (enforced server-side, not just a UI hint); only the kitchen owner can flip it back to "Kitchen Open." Shown as a badge everywhere the kitchen appears to customers.
- **Order flow, split into two tabs** so an accept/reject decision is never confused with what's actually cooking:
  - *Orders* — newly placed orders only, oldest first (first-come-first-served); accept or reject here.
  - *Preparing* — accepted orders, numbered in the exact order they were accepted, so prep/delivery follows a clear sequence; a rejected order never appears here. Delivered/rejected orders drop into a History section below it.
- **Earnings reports** — monthly/yearly view with total earnings, amount actually paid so far, order count, and a per-dish breakdown (qty sold + revenue) that surfaces the most popular dish.
- Kitchen's own phone number is shown on their public profile/cards so customers can reach them directly.

## Admin tools

- **Approvals** tab: pending signups, pending PIN resets, and a permanent history — all with reasons where rejected.
- **Users** tab: full user directory with one-click impersonation.
- **Kitchens** tab: lists every kitchen; admin can delete a kitchen outright (cascades to its dishes; order history is preserved).

## Photos

- Upload + **drag-to-reposition crop** (fixed 4:3 frame, pinch/slider zoom) for both kitchen and dish photos.
- Only the **compressed, cropped** image is stored (no separate full-resolution original) to keep the database small.

## Design & UX

- Warm, food-app color theme (saffron/terracotta), mobile-first responsive layout throughout.
- Top nav: brand + horizontally-scrolling role-aware tabs + a user dropdown menu (name, sign out) — inspired by moment-kart's nav bar.
- Error handling: every API route returns a clean, generic error on failure (never a raw crash page or stack trace) and logs the real error server-side; the client never shows a broken JSON-parse error either.

## Technical notes

- **Stack**: Vite + React (no router library — page state only), Vercel serverless functions under `/api`, Neon Postgres in production, browser `localStorage` in local dev (no database needed to develop).
- **IDs**: all primary keys are plain numbers (`Date.now()`), never UUIDs.
- **Structured logging**: one JSON line per event via `api/_log.js`, visible in Vercel's function logs / `vercel logs` — no on-disk files (serverless has no persistent filesystem to roll logs on).
- **E2E tests** (`e2e/`): two Playwright smoke scripts — `flow.mjs` (full signup → approval → kitchen setup → browse → order → deliver → pay lifecycle) and `photo-upload.mjs` (crop modal interaction) — runnable via `npm run test:e2e`.
