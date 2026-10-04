import { test, expect } from '@playwright/test';
import { signIn } from './helpers/session';

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test('catalog lists the launch lineup and filters by style', async ({ page }) => {
  await page.goto('/baraba-ride');
  const products = page.getByRole('region', { name: 'Products' });
  await expect(products.getByRole('link')).toHaveCount(10);
  await expect(products.getByRole('heading', { name: 'Fold Colosseum' })).toBeVisible();

  await page.getByRole('group', { name: 'Style' }).getByRole('button', { name: 'Spin' }).click();
  await expect(products.getByRole('link')).toHaveCount(3);
});

test('product detail shows named parts', async ({ page }) => {
  await page.goto('/baraba-ride');
  await page.getByRole('link', { name: /BR-07/ }).click();
  await expect(page).toHaveURL('/baraba-ride?product=BR-07');
  await expect(page.getByRole('heading', { name: 'Falcon Kit' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Named parts' })).toContainText('Mega Launcher');

  await page.getByRole('link', { name: /All products/ }).click();
  await expect(page).toHaveURL('/baraba-ride');
});

test('parts view groups parts by slot and links to products', async ({ page }) => {
  await page.goto('/baraba-ride');
  await page.getByRole('link', { name: 'Parts', exact: true }).click();
  await expect(page).toHaveURL('/baraba-ride?view=parts');
  await expect(page.getByRole('heading', { name: 'Bumpers' })).toBeVisible();

  await page
    .getByRole('list', { name: 'Alpha found in' })
    .getByRole('link', { name: 'BR-03 Fury Lizard' })
    .click();
  await expect(page.getByRole('heading', { name: 'Fury Lizard' })).toBeVisible();
});

test('catalog loads images only from the app origin and the image CDN', async ({ page }) => {
  // The image CDN is only contacted when the server under test has
  // VITE_IMAGEKIT_URL_ENDPOINT set (a reused dev server); CI runs without it.
  const allowed = ['http://127.0.0.1:5175/', 'https://ik.imagekit.io/'];
  const disallowed: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (request.resourceType() === 'image' && !allowed.some((origin) => url.startsWith(origin))) {
      disallowed.push(url);
    }
  });

  await page.goto('/baraba-ride');
  await expect(page.getByRole('region', { name: 'Products' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'BR-01 Storm Falcon' })).toBeVisible();

  await page.goto('/baraba-ride?product=BR-01');
  await expect(page.getByRole('list', { name: 'Product shots' }).getByRole('img')).toHaveCount(5);

  await page.goto('/baraba-ride?view=parts');
  const variants = page.getByRole('list', { name: 'Storm Falcon variants' });
  await expect(variants).toBeVisible();

  // With the image CDN configured the variants are real images; they must load.
  // Without it (CI) they are placeholders and there is nothing to load.
  for (const image of await variants.locator('img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  }
  expect(disallowed).toEqual([]);
});
