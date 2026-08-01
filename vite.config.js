import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Widened so the dev-mode bootstrap admin check (client-side only, no backend
  // in `npm run dev`) can read ADMIN_APARTMENT/ADMIN_PIN without a VITE_ prefix —
  // keeping the same env var names as production. That check only runs behind
  // `if (!import.meta.env.PROD)`, which Vite inlines to `if (false)` in a
  // production build and dead-code-eliminates during minification — but that's
  // an optimization, not a guarantee: never disable minification for a
  // production build, or the real ADMIN_PIN value could ship in the bundle.
  envPrefix: ['VITE_', 'ADMIN_'],
});
