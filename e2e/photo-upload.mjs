// Focused smoke test for the photo upload + crop flow (kitchen photo and dish photo):
// opens the crop modal, drags to reposition, zooms, confirms, and checks the photo
// persists through save and the Remove button works.
//
// Prerequisite: the dev server must already be running (`npm run dev`).
// Usage: node e2e/photo-upload.mjs

import { chromium } from 'playwright';
import { BASE_URL, loadEnvLocal, randomPhone, randomApartment, shooter, assertServerUp, trackConsoleErrors, FIXTURE_PHOTO } from './_helpers.mjs';

await assertServerUp();

const env = loadEnvLocal();
const ADMIN_APARTMENT = env.ADMIN_APARTMENT;
const ADMIN_PIN = env.ADMIN_PIN;
if (!ADMIN_APARTMENT || !ADMIN_PIN) {
  throw new Error('ADMIN_APARTMENT / ADMIN_PIN not found in .env.local — needed to sign in as the bootstrap admin.');
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 430, height: 900 } });
const page = await context.newPage();
const shot = shooter(page, 'photo-upload');
const errors = trackConsoleErrors(page);

const kitchenPhone = randomPhone();
const kitchenApartment = randomApartment('A');

async function login(apartment, pin) {
  await page.waitForSelector('text=Apartment Number');
  await page.locator('input[placeholder="e.g. B-204"]').first().fill(apartment);
  await page.locator('input[placeholder="••••"]').first().fill(pin);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

try {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  // Sign up + approve a kitchen so there's a "My Kitchen" screen to upload into.
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByText('Create an account').click();
  await page.getByText('Cook & sell').click();
  await page.locator('input[placeholder="Your full name"]').fill('Photo Test Kitchen');
  await page.locator('input[placeholder="10-digit mobile number"]').fill(kitchenPhone);
  await page.locator('input[placeholder="e.g. B-204"]').fill(kitchenApartment);
  const pinInputs = page.locator('input[type="password"]');
  await pinInputs.nth(0).fill('9998');
  await pinInputs.nth(1).fill('9998');
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await page.waitForSelector('text=Account created!');
  await page.getByText('← Back to sign in').click();

  await login(ADMIN_APARTMENT, ADMIN_PIN);
  await page.waitForSelector('text=Approvals');
  await page.getByRole('button', { name: /Approvals/ }).click();
  const row = page.locator('div', { hasText: 'Photo Test Kitchen' }).filter({ hasText: 'Approve' }).first();
  await row.getByRole('button', { name: '✓ Approve' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /▾/ }).click(); // open the user menu
  await page.getByRole('button', { name: 'Sign out' }).click();

  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await login(kitchenApartment, '9998');
  await page.waitForSelector('text=My Kitchen');
  await page.getByRole('button', { name: /My Kitchen/ }).click();
  await page.waitForSelector('text=Set up your kitchen');

  // Upload + crop the kitchen photo
  await page.setInputFiles('input[type="file"]', FIXTURE_PHOTO);
  await page.waitForSelector('text=Position photo');
  await shot('01-crop-modal-open');

  const viewport = page.locator('div', { has: page.locator('img[alt="Crop preview"]') }).first();
  const box = await viewport.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 20, box.y + box.height / 2 - 10, { steps: 5 });
  await page.mouse.up();
  await shot('02-after-drag');

  await page.locator('input[type="range"]').fill('1.8');
  await shot('03-after-zoom');

  await page.getByRole('button', { name: 'Use this photo' }).click();
  await page.waitForTimeout(300);
  await shot('04-photo-set-in-form');

  await page.locator('input[placeholder="e.g. Anjali\'s Kitchen"]').fill('Photo Test Kitchen Shop');
  await page.locator('input[placeholder="yourname@upi"]').fill('phototest@upi');
  await page.getByRole('button', { name: 'Save Kitchen' }).click();
  await page.waitForSelector('text=+ Add Dish');
  await shot('05-kitchen-saved-with-photo');

  const imgSrc = await page.locator('img[alt=""]').first().getAttribute('src').catch(() => null);
  if (!imgSrc?.startsWith('data:image/jpeg;base64,')) {
    throw new Error(`Kitchen photo did not persist as a JPEG data URL (got: ${imgSrc?.slice(0, 30)})`);
  }
  console.log('Kitchen thumbnail persisted as JPEG data URL: OK');

  // Dish photo upload + Remove button
  await page.getByRole('button', { name: '+ Add Dish' }).click();
  await page.waitForSelector('text=Add Dish');
  await page.setInputFiles('input[type="file"]', FIXTURE_PHOTO);
  await page.waitForSelector('text=Position photo');
  await page.getByRole('button', { name: 'Use this photo' }).click();
  await page.waitForTimeout(300);
  await shot('06-dish-photo-set');

  const removeVisible = await page.getByRole('button', { name: 'Remove' }).isVisible();
  if (!removeVisible) throw new Error('Remove button did not appear after setting a dish photo');
  console.log('Remove button visible after photo set: OK');

  await page.locator('input[placeholder="e.g. Chicken Biryani"]').fill('Photo Dish');
  await page.locator('input[placeholder="e.g. 150"]').fill('99');
  await page.getByRole('button', { name: 'Add Dish', exact: true }).click();
  await page.waitForTimeout(400);
  await shot('07-dish-with-photo-in-list');

  console.log('PHOTO UPLOAD TEST COMPLETED');
  if (errors.length) {
    console.log('CONSOLE ERRORS:', JSON.stringify(errors, null, 2));
    process.exitCode = 1;
  }
} catch (err) {
  console.error('PHOTO TEST FAILED:', err.message);
  await shot('ERROR');
  process.exitCode = 1;
} finally {
  await browser.close();
}
