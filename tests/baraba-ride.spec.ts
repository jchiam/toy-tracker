import { test, expect } from '@playwright/test';
import { signIn } from './helpers/session';

test.beforeEach(async ({ page }) => {
  await signIn(page);
  // The seeded session is not a real one, so answer inventory reads locally.
  await page.route('**/rest/v1/br_*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
});

test('catalog lists the launch lineup and filters by style', async ({ page }) => {
  await page.goto('/baraba-ride');
  await expect(page).toHaveURL('/baraba-ride/catalog');
  const products = page.getByRole('region', { name: 'Products' });
  await expect(products.getByRole('link')).toHaveCount(10);
  await expect(products.getByRole('heading', { name: 'Fold Colosseum' })).toBeVisible();

  await page.getByRole('group', { name: 'Style' }).getByRole('button', { name: 'Spin' }).click();
  await expect(products.getByRole('link')).toHaveCount(3);
});

test('product detail shows named parts', async ({ page }) => {
  await page.goto('/baraba-ride/catalog');
  await page.getByRole('link', { name: /BR-07/ }).click();
  await expect(page).toHaveURL('/baraba-ride/catalog/products/BR-07');
  await expect(page.getByRole('heading', { name: 'Falcon Kit' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Named parts' })).toContainText('Mega Launcher');

  await page.getByRole('link', { name: /All products/ }).click();
  await expect(page).toHaveURL('/baraba-ride/catalog');
});

test('parts view groups parts by slot and links to products', async ({ page }) => {
  await page.goto('/baraba-ride/catalog');
  await page.getByRole('link', { name: 'Parts', exact: true }).click();
  await expect(page).toHaveURL('/baraba-ride/catalog/parts');
  await expect(page.getByRole('heading', { name: 'Bumpers' })).toBeVisible();

  await page
    .getByRole('list', { name: 'Alpha found in' })
    .getByRole('link', { name: 'BR-03 Fury Lizard' })
    .click();
  await expect(page).toHaveURL('/baraba-ride/catalog/products/BR-03');
  await expect(page.getByRole('heading', { name: 'Fury Lizard' })).toBeVisible();
});

test('segment navigation switches between Catalog, Inventory and Builds', async ({ page }) => {
  await page.goto('/baraba-ride/catalog');
  const segments = page.getByRole('navigation', { name: 'Segments' });
  await expect(segments.getByRole('link', { name: 'Catalog' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await segments.getByRole('link', { name: 'Inventory' }).click();
  await expect(page).toHaveURL('/baraba-ride/inventory');
  await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Inventory views' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Catalog views' })).toHaveCount(0);

  await segments.getByRole('link', { name: 'Builds' }).click();
  await expect(page).toHaveURL('/baraba-ride/builds');
  await expect(page.getByRole('heading', { name: 'Builds' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Catalog views' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Inventory views' })).toHaveCount(0);

  await page.goBack();
  await expect(page).toHaveURL('/baraba-ride/inventory');
  await page.goBack();
  await expect(page).toHaveURL('/baraba-ride/catalog');
  await expect(page.getByRole('region', { name: 'Products' })).toBeVisible();
});

test('inventory sub-navigation switches between Items and Purchases', async ({ page }) => {
  await page.goto('/baraba-ride/inventory');
  const views = page.getByRole('navigation', { name: 'Inventory views' });
  await expect(views.getByRole('link', { name: 'Items' })).toHaveAttribute('aria-current', 'page');

  await views.getByRole('link', { name: 'Purchases' }).click();
  await expect(page).toHaveURL('/baraba-ride/inventory/purchases');
  await expect(page.getByRole('heading', { name: 'Purchases' })).toBeVisible();
  await expect(views.getByRole('link', { name: 'Purchases' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await page.goto('/baraba-ride/inventory/purchases');
  await expect(page.getByRole('heading', { name: 'Purchases' })).toBeVisible();

  await page.goto('/baraba-ride/inventory/nowhere');
  await expect(page).toHaveURL('/baraba-ride/inventory');
  await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible();
});

test('earlier query-string links reach their new addresses', async ({ page }) => {
  await page.goto('/baraba-ride?product=BR-01');
  await expect(page).toHaveURL('/baraba-ride/catalog/products/BR-01');
  await expect(page.getByRole('heading', { name: 'Storm Falcon' })).toBeVisible();

  await page.goto('/baraba-ride?view=parts');
  await expect(page).toHaveURL('/baraba-ride/catalog/parts');
  await expect(page.getByRole('heading', { name: 'Bumpers' })).toBeVisible();
});

test('default redirects replace the history entry', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Baraba Ride/ }).click();
  await expect(page).toHaveURL('/baraba-ride/catalog');
  await page.goBack();
  await expect(page).toHaveURL('/');

  await page.goto('/baraba-ride/nowhere');
  await expect(page).toHaveURL('/baraba-ride/catalog');
  await expect(page.getByRole('region', { name: 'Products' })).toBeVisible();
});

test('navigation rows fit a phone-width viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/baraba-ride/catalog');
  await expect(page.getByRole('navigation', { name: 'Segments' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Catalog views' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
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

  await page.goto('/baraba-ride/catalog');
  await expect(page.getByRole('region', { name: 'Products' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'BR-01 Storm Falcon' })).toBeVisible();

  await page.goto('/baraba-ride/catalog/products/BR-01');
  await expect(page.getByRole('list', { name: 'Product shots' }).getByRole('img')).toHaveCount(5);

  await page.goto('/baraba-ride/catalog/parts');
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
