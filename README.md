# Kitchen Kart

Home-kitchen ordering app — kitchens list dishes with price/availability, neighbors browse and order, kitchens accept/deliver, payment via UPI.

## Local dev

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Data is saved to browser localStorage — no database needed.

`.env.local` has the bootstrap admin login:

```bash
ADMIN_PHONE=9886755430
ADMIN_PIN=1234
```

Sign up as "Kitchen" or "Customer", then approve the account by logging in as admin above → **Approvals** tab.

## Deploy to Vercel

1. Push to GitHub, import the repo in [vercel.com](https://vercel.com).
2. **Storage** → attach a **Postgres (Neon)** database (`DATABASE_URL` is set automatically).
3. **Settings → Environment Variables**:

   | Variable      | Value                          |
   | ------------- | ------------------------------ |
   | `ADMIN_PHONE` | bootstrap admin's phone number |
   | `ADMIN_PIN`   | bootstrap admin's 4-digit PIN  |
   | `AUTH_SECRET` | `openssl rand -hex 32`         |

4. Deploy.

To change the admin PIN: update `ADMIN_PIN` in Vercel and redeploy.

## How approvals work

Signup collects phone + apartment + a 4-digit PIN, and issues a CODE + shareable link. Signer shares it on WhatsApp; an admin or any approved kitchen (kitchens are low-level admins) approves from **Approvals**. Every decision is logged permanently.

## E2E tests

See [e2e/README.md](e2e/README.md).
