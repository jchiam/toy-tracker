import { test, expect } from '@playwright/test';

test('landing page loads with the Baraba Ride card', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'The JonZone Toy Zone' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Baraba Ride' })).toBeVisible();
});

test('signed-out landing page marks every card as requiring login', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Requires Login')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Sign In with Google' })).toBeVisible();
});

test('direct URL access shows the auth gate when signed out', async ({ page }) => {
  await page.goto('/baraba-ride');
  await expect(page.getByRole('heading', { name: 'Welcome to the Toy Zone' })).toBeVisible();
});

test('switcher lists the game and brand returns home', async ({ page }) => {
  await page.goto('/baraba-ride');
  await page.getByRole('button', { name: 'Switch Game' }).click();
  await page.getByRole('link', { name: /Baraba Ride/ }).click();
  await expect(page).toHaveURL('/baraba-ride');

  await page.getByRole('link', { name: /The JonZone Toy Zone/ }).click();
  await expect(page).toHaveURL('/');
});

test('switcher absent on landing page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /The JonZone Toy Zone/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Switch Game' })).toHaveCount(0);
});
