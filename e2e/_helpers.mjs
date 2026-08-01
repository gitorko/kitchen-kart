import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

export const BASE_URL = process.env.KK_BASE_URL || 'http://localhost:5173';

// Reads .env.local the same way Vite would, without pulling in a dependency.
export function loadEnvLocal() {
  try {
    const content = fs.readFileSync(path.join(ROOT, '..', '.env.local'), 'utf8');
    const env = {};
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
    return env;
  } catch {
    return {};
  }
}

export function randomPhone() {
  return Math.floor(6000000000 + Math.random() * 2999999999).toString();
}

// Apartment number is the login identifier now, so it has to be unique per run.
export function randomApartment(prefix) {
  return `${prefix}-${Math.floor(100 + Math.random() * 899)}`;
}

export function shooter(page, name) {
  const dir = path.join(ROOT, 'screenshots', name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  let step = 0;
  return async label => {
    step++;
    const file = path.join(dir, `${String(step).padStart(2, '0')}-${label}.png`);
    await page.screenshot({ path: file });
    console.log(`shot: ${label}`);
  };
}

export async function assertServerUp() {
  try {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error(`status ${res.status}`);
  } catch (err) {
    throw new Error(
      `Kitchen Kart dev server isn't reachable at ${BASE_URL} (${err.message}).\n` +
      `Run "npm run dev" in another terminal first, or set KK_BASE_URL.`
    );
  }
}

export const FIXTURE_PHOTO = path.join(ROOT, 'fixtures', 'test-photo.jpg');

// Chromium's DevTools protocol reports a spurious "Failed to load resource:
// net::ERR_FILE_NOT_FOUND" for blob: URLs used by <img> during automation —
// the image still decodes and renders fine (verified separately). The crop
// modal is the only place this app uses blob: URLs, so it's safe to ignore.
const BENIGN_BLOB_URL_ERROR = 'Failed to load resource: net::ERR_FILE_NOT_FOUND';

export function trackConsoleErrors(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && msg.text() !== BENIGN_BLOB_URL_ERROR) errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));
  return errors;
}
