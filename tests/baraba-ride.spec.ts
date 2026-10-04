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

test('catalog loads no images from outside the app origin', async ({ page }) => {
  const foreignImages: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'image' && !request.url().startsWith('http://127.0.0.1:5175')) {
      foreignImages.push(request.url());
    }
  });

  await page.goto('/baraba-ride');
  await expect(page.getByRole('region', { name: 'Products' })).toBeVisible();
  await page.goto('/baraba-ride?view=parts');
  await expect(page.getByRole('region', { name: 'Parts' })).toBeVisible();
  expect(foreignImages).toEqual([]);
});
