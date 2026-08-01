// End-to-end smoke test covering the whole app: public browsing, kitchen signup,
// admin approval, kitchen setup + dish CRUD, customer signup, kitchen-approves-customer,
// cart + checkout, order accept/deliver, and UPI payment marking.
//
// Prerequisite: the dev server must already be running (`npm run dev`).
// Usage: node e2e/flow.mjs

import { chromium } from 'playwright';
import { BASE_URL, loadEnvLocal, randomPhone, shooter, assertServerUp, trackConsoleErrors } from './_helpers.mjs';

await assertServerUp();

const env = loadEnvLocal();
const ADMIN_PHONE = env.ADMIN_PHONE;
const ADMIN_PIN = env.ADMIN_PIN;
if (!ADMIN_PHONE || !ADMIN_PIN) {
  throw new Error('ADMIN_PHONE / ADMIN_PIN not found in .env.local — needed to sign in as the bootstrap admin.');
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 430, height: 900 } });
const page = await context.newPage();
const shot = shooter(page, 'flow');
const errors = trackConsoleErrors(page);

const kitchenPhone = randomPhone();
const customerPhone = randomPhone();

async function signOutThenSignIn() {
  await page.getByRole('button', { name: /▾/ }).click(); // open the user menu
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

async function login(phone, pin) {
  await page.waitForSelector('text=Phone Number');
  await page.locator('input[placeholder="10-digit mobile number"]').fill(phone);
  await page.locator('input[placeholder="••••"]').first().fill(pin);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

try {
  // 0. Public browsing without login
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Kitchen Kart');
  await shot('00-home-public');

  // 1. Sign up as kitchen
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForSelector('text=Create an account');
  await page.getByText('Create an account').click();
  await page.waitForSelector('text=Create your account');
  await page.getByText('Cook & sell').click();
  await page.locator('input[placeholder="Your full name"]').fill('Anjali Kitchen Owner');
  await page.locator('input[placeholder="10-digit mobile number"]').fill(kitchenPhone);
  await page.locator('input[placeholder="e.g. B-204"]').fill('B-204');
  const pinInputs = page.locator('input[type="password"]');
  await pinInputs.nth(0).fill('1112');
  await pinInputs.nth(1).fill('1112');
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await page.waitForSelector('text=Account created!');
  const kitchenCode = (await page.locator('text=/^[A-Z0-9]{6}$/').first().textContent()).trim();
  console.log('Kitchen signup code:', kitchenCode);
  await shot('01-kitchen-signup-code');
  await page.getByText('← Back to sign in').click();

  // 2. Log in as bootstrap admin, approve kitchen
  await login(ADMIN_PHONE, ADMIN_PIN);
  await page.waitForSelector('text=Approvals');
  await page.getByRole('button', { name: /Approvals/ }).click();
  await page.waitForSelector('text=Pending Approvals');
  await shot('02-admin-approvals-pending');
  const kitchenRow = page.locator('div', { hasText: 'Anjali Kitchen Owner' }).filter({ hasText: 'Approve' }).first();
  await kitchenRow.getByRole('button', { name: '✓ Approve' }).click();
  await page.waitForTimeout(500);
  await shot('03-admin-approved-kitchen');
  await signOutThenSignIn();

  // 3. Log in as kitchen, set up kitchen + add dishes
  await login(kitchenPhone, '1112');
  await page.waitForSelector('text=My Kitchen');
  await page.getByRole('button', { name: /My Kitchen/ }).click();
  await page.waitForSelector('text=Set up your kitchen');
  await shot('04-kitchen-setup-form');
  await page.locator('input[placeholder="e.g. Anjali\'s Kitchen"]').fill("Anjali's Kitchen");
  await page.locator('input[placeholder="yourname@upi"]').fill('anjali@okhdfcbank');
  await page.locator('input[placeholder="What you specialize in…"]').fill('South Indian home food');
  await page.getByRole('button', { name: 'Save Kitchen' }).click();
  await page.waitForSelector('text=+ Add Dish');
  await shot('05-kitchen-dashboard');

  // Add dish 1 (in stock)
  await page.getByRole('button', { name: '+ Add Dish' }).click();
  await page.waitForSelector('text=Add Dish');
  await page.locator('input[placeholder="e.g. Chicken Biryani"]').fill('Veg Biryani');
  await page.locator('input[placeholder="e.g. 150"]').fill('180');
  await shot('06-dish-form-empty');
  await page.getByRole('button', { name: 'Add Dish', exact: true }).click();
  await page.waitForTimeout(400);
  await shot('07-dish1-added');

  // Add dish 2 (out of stock)
  await page.getByRole('button', { name: '+ Add Dish' }).click();
  await page.waitForSelector('text=Add Dish');
  await page.locator('input[placeholder="e.g. Chicken Biryani"]').fill('Paneer Tikka');
  await page.locator('input[placeholder="e.g. 150"]').fill('220');
  await page.getByText('✓ In Stock').click();
  await page.getByRole('button', { name: 'Add Dish', exact: true }).click();
  await page.waitForTimeout(400);
  await shot('08-dish2-outofstock-added');

  await signOutThenSignIn();

  // 4. Sign up as customer
  await page.waitForSelector('text=Create an account');
  await page.getByText('Create an account').click();
  await page.waitForSelector('text=Create your account');
  await page.locator('input[placeholder="Your full name"]').fill('Ravi Customer');
  await page.locator('input[placeholder="10-digit mobile number"]').fill(customerPhone);
  await page.locator('input[placeholder="e.g. B-204"]').fill('C-101');
  const pinInputs2 = page.locator('input[type="password"]');
  await pinInputs2.nth(0).fill('2223');
  await pinInputs2.nth(1).fill('2223');
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await page.waitForSelector('text=Account created!');
  console.log('Customer signed up ok');
  await page.getByText('← Back to sign in').click();

  // 5. Log back in as kitchen, approve customer (kitchens act as low-level admins)
  await login(kitchenPhone, '1112');
  await page.waitForSelector('text=Approvals');
  await page.getByRole('button', { name: /Approvals/ }).click();
  await page.waitForSelector('text=Ravi Customer');
  await shot('09-kitchen-can-approve-customer');
  const custRow = page.locator('div', { hasText: 'Ravi Customer' }).filter({ hasText: 'Approve' }).first();
  await custRow.getByRole('button', { name: '✓ Approve' }).click();
  await page.waitForTimeout(500);
  await signOutThenSignIn();

  // 6. Log in as customer, browse
  await login(customerPhone, '2223');
  await page.waitForSelector('text=All Dishes');
  await shot('10-customer-home-all-dishes');

  await page.getByRole('button', { name: 'Browse by Kitchen' }).click();
  await page.waitForSelector("text=Anjali's Kitchen");
  await shot('11-browse-by-kitchen');
  await page.getByText("Anjali's Kitchen").click();
  await page.waitForTimeout(300);
  await shot('12-single-kitchen-dishes');

  await page.getByRole('button', { name: '← All Kitchens' }).click();
  await page.getByRole('button', { name: 'All Dishes' }).click();
  await page.locator('input[placeholder="Search dishes or kitchens…"]').fill('Biryani');
  await page.waitForTimeout(300);
  await shot('13-search-grouped');

  await page.locator('input[placeholder="Search dishes or kitchens…"]').fill('');
  await page.waitForTimeout(300);

  // Heart the Veg Biryani dish
  const heartBtn = page.locator('button', { has: page.locator('span', { hasText: '🤍' }) }).first();
  if (await heartBtn.isVisible().catch(() => false)) {
    await heartBtn.click();
    await page.waitForTimeout(300);
    await shot('14-hearted');
  } else {
    console.log('WARN: heart button not found');
  }

  // Add Veg Biryani to cart with a comment
  await page.locator('button', { hasText: '+ Add' }).first().click();
  await page.waitForTimeout(300);
  await shot('15-added-to-cart');

  await page.locator('button', { hasText: /item/ }).click();
  await page.waitForSelector('text=Your Cart');
  await shot('16-cart-drawer');
  await page.locator('input[placeholder="Note for the chef (e.g. less salt)"]').first().fill('less salt please');
  await page.getByRole('button', { name: /Place Order with/ }).click();
  await page.waitForTimeout(600);
  await shot('17-order-placed-cart-cleared');
  await page.mouse.click(5, 5);
  await page.waitForTimeout(200);

  await page.getByRole('button', { name: /My Orders/ }).click();
  await page.waitForSelector('text=My Orders');
  await shot('18-customer-my-orders');

  await signOutThenSignIn();

  // 7. Kitchen accepts + delivers
  await login(kitchenPhone, '1112');
  await page.waitForSelector('text=My Kitchen');
  await page.getByRole('button', { name: /My Kitchen/ }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /^Orders/ }).click();
  await page.waitForSelector('text=Ravi Customer');
  await shot('19-kitchen-incoming-order');
  await page.getByRole('button', { name: 'Accept' }).click();
  await page.waitForTimeout(400);
  await shot('20-order-accepted');
  await page.getByRole('button', { name: 'Mark Delivered' }).click();
  await page.waitForTimeout(400);
  await shot('21-order-delivered');
  await signOutThenSignIn();

  // 8. Customer pays via UPI
  await login(customerPhone, '2223');
  await page.waitForSelector('text=My Orders');
  await page.getByRole('button', { name: /My Orders/ }).click();
  await page.waitForSelector('text=💳 Pay via UPI');
  await shot('22-order-delivered-customer-view');
  await page.getByRole('button', { name: '💳 Pay via UPI' }).click();
  await page.waitForTimeout(400);
  await shot('23-upi-qr');
  await page.getByRole('button', { name: "I've paid — mark as paid" }).click();
  await page.waitForTimeout(400);
  await shot('24-marked-paid');

  console.log('ALL STEPS COMPLETED');
  if (errors.length) {
    console.log('CONSOLE ERRORS:', JSON.stringify(errors, null, 2));
    process.exitCode = 1;
  }
} catch (err) {
  console.error('FLOW TEST FAILED:', err.message);
  await shot('ERROR');
  process.exitCode = 1;
} finally {
  await browser.close();
}
