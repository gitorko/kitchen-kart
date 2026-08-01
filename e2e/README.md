# E2E smoke tests

Plain Playwright scripts (no test runner). Screenshots go to `e2e/screenshots/` (gitignored).

## Setup

```bash
npx playwright install chromium
```

## Run

```bash
npm run dev            # terminal 1
npm run test:e2e       # terminal 2 — runs flow.mjs + photo-upload.mjs
```

Or individually:

```bash
node e2e/flow.mjs          # signup, approval, kitchen setup, dishes, cart, checkout, order lifecycle, UPI payment
node e2e/photo-upload.mjs  # photo upload + crop modal
```

Reads `ADMIN_APARTMENT` / `ADMIN_PIN` from `.env.local` for the bootstrap admin login. Uses random apartment numbers and phone numbers each run.
