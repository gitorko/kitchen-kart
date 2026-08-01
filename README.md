# Kitchen Kart

A home-kitchen ordering app — house wives (kitchens) list dishes with price and availability, neighbors browse and order, kitchens accept and deliver, payment happens manually via UPI.

## Run Locally

1. Install dependencies: `npm install`
2. `.env.local` already contains a dev bootstrap admin login:
   ```
   VITE_ADMIN_PHONE=9999999999
   VITE_ADMIN_PIN=123456
   ```
3. `npm run dev` → open `http://localhost:5173`

> Data is saved to browser localStorage locally — no database needed. Sign up as a "Kitchen" or "Customer", then approve the account by logging in as the bootstrap admin above and using the Approvals tab.

## Deploy to Vercel

1. Push to GitHub and import the repo in [vercel.com](https://vercel.com).
2. Go to **Storage** → attach a **Postgres (Neon)** database.
3. Go to **Settings → Environment Variables** and add:

   | Variable | Value |
   |---|---|
   | `ADMIN_PHONE` | the phone number for the bootstrap admin account |
   | `ADMIN_PIN` | a 6-digit PIN for the bootstrap admin |
   | `AUTH_SECRET` | run `openssl rand -hex 32` |

4. Deploy.

**To change the admin PIN:** update `ADMIN_PIN` in Vercel env vars and redeploy.

## How approvals work

Signup collects phone number + apartment number + a 6-digit PIN, and issues a short CODE plus a shareable link. The signer shares that link/code on WhatsApp and asks an admin (or any approved kitchen — kitchens act as low-level admins) to approve it from the **Approvals** tab. Every approval/rejection is kept in a permanent history log.
