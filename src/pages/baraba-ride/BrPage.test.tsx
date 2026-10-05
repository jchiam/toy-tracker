import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import type { Session } from '@supabase/supabase-js';
import { BrPage } from './BrPage';
import type { BrInventory } from '@/hooks/useBrInventory';

// The inventory segment loads user data through this hook; the page tests
// only exercise navigation, so it resolves to an empty, loaded inventory.
vi.mock('@/hooks/useBrInventory', () => ({
  useBrInventory: (): BrInventory => ({
    purchases: [],
    instances: [],
    loading: false,
    error: null,
    actions: {
      recordPurchase: vi.fn(),
      addInstances: vi.fn(),
      setInstanceStatus: vi.fn(),
      updateInstanceNote: vi.fn(),
      deleteInstance: vi.fn(),
      deletePurchase: vi.fn(),
      reload: vi.fn(),
    },
  }),
}));

const mockSession = {
  user: { id: 'test-user-123', email: 'test@example.com' },
} as unknown as Session;

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

/** Mounts the page the way App does: under the game's route with a splat. */
function renderAt(
  path: string,
  {
    session = mockSession,
    isAuthLoading = false,
  }: { session?: Session | null; isAuthLoading?: boolean } = {},
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/baraba-ride/*"
          element={<BrPage session={session} isAuthLoading={isAuthLoading} onSignIn={vi.fn()} />}
        />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

const location = () => screen.getByTestId('location').textContent;
const segments = () => within(screen.getByRole('navigation', { name: 'Segments' }));
const catalogViews = () => within(screen.getByRole('navigation', { name: 'Catalog views' }));
const inventoryViews = () => within(screen.getByRole('navigation', { name: 'Inventory views' }));

afterEach(cleanup);

describe('BrPage', () => {
  it('shows the auth gate when signed out', () => {
    renderAt('/baraba-ride', { session: null });
    expect(screen.getByRole('heading', { name: 'Welcome to the Toy Zone' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Products' })).toBeNull();
    expect(location()).toBe('/baraba-ride');
  });

  it('gates a segment address when signed out, leaving the address as opened', () => {
    renderAt('/baraba-ride/builds', { session: null });
    expect(screen.getByRole('heading', { name: 'Welcome to the Toy Zone' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Segments' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Builds' })).toBeNull();
    expect(location()).toBe('/baraba-ride/builds');
  });

  it('shows a loading message while auth is resolving', () => {
    renderAt('/baraba-ride', { session: null, isAuthLoading: true });
    expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
  });

  describe('segments', () => {
    it('offers Catalog, Inventory and Builds in order', () => {
      renderAt('/baraba-ride/catalog');
      expect(
        segments()
          .getAllByRole('link')
          .map((link) => link.textContent),
      ).toEqual(['Catalog', 'Inventory', 'Builds']);
    });

    it('marks Catalog as current on a product detail', () => {
      renderAt('/baraba-ride/catalog/products/BR-01');
      expect(segments().getByRole('link', { name: 'Catalog' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(segments().getByRole('link', { name: 'Inventory' })).not.toHaveAttribute(
        'aria-current',
      );
      expect(segments().getByRole('link', { name: 'Builds' })).not.toHaveAttribute('aria-current');
    });

    it('switches segment from the navigation', async () => {
      const user = userEvent.setup();
      renderAt('/baraba-ride/catalog');
      await user.click(segments().getByRole('link', { name: 'Builds' }));
      expect(location()).toBe('/baraba-ride/builds');
      expect(segments().getByRole('link', { name: 'Builds' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(screen.getByRole('heading', { level: 2, name: 'Builds' })).toBeInTheDocument();
    });

    it('shows the Inventory segment at its own address', () => {
      renderAt('/baraba-ride/inventory');
      expect(screen.getByRole('heading', { level: 1, name: 'Baraba Ride' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Items' })).toBeInTheDocument();
      expect(screen.queryByText(/not available yet/)).toBeNull();
      expect(segments().getByRole('link', { name: 'Inventory' })).toHaveAttribute(
        'aria-current',
        'page',
      );
    });

    it('shows the Builds placeholder at its own address', () => {
      renderAt('/baraba-ride/builds');
      expect(screen.getByRole('heading', { level: 2, name: 'Builds' })).toBeInTheDocument();
      expect(screen.getByText(/Builds is not available yet\./)).toBeInTheDocument();
    });

    it.each(['/baraba-ride/inventory', '/baraba-ride/builds'])(
      'shows no catalog sub-navigation at %s',
      (path) => {
        renderAt(path);
        expect(screen.queryByRole('navigation', { name: 'Catalog views' })).toBeNull();
      },
    );

    it.each(['/baraba-ride/catalog', '/baraba-ride/builds'])(
      'shows no inventory sub-navigation at %s',
      (path) => {
        renderAt(path);
        expect(screen.queryByRole('navigation', { name: 'Inventory views' })).toBeNull();
      },
    );
  });

  describe('inventory views', () => {
    it('shows Items as current at the inventory address', () => {
      renderAt('/baraba-ride/inventory');
      expect(inventoryViews().getByRole('link', { name: 'Items' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(inventoryViews().getByRole('link', { name: 'Purchases' })).not.toHaveAttribute(
        'aria-current',
      );
    });

    it('switches to Purchases from the sub-navigation without a reload', async () => {
      renderAt('/baraba-ride/inventory');
      await userEvent.click(inventoryViews().getByRole('link', { name: 'Purchases' }));
      expect(location()).toBe('/baraba-ride/inventory/purchases');
      expect(inventoryViews().getByRole('link', { name: 'Purchases' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(screen.getByRole('heading', { level: 2, name: 'Purchases' })).toBeInTheDocument();
    });

    it('opens Purchases by address', () => {
      renderAt('/baraba-ride/inventory/purchases');
      expect(screen.getByRole('heading', { level: 2, name: 'Purchases' })).toBeInTheDocument();
      expect(segments().getByRole('link', { name: 'Inventory' })).toHaveAttribute(
        'aria-current',
        'page',
      );
    });
  });

  describe('redirects', () => {
    it.each([
      ['/baraba-ride', '/baraba-ride/catalog'],
      ['/baraba-ride/nowhere', '/baraba-ride/catalog'],
      ['/baraba-ride/catalog/nowhere', '/baraba-ride/catalog'],
      ['/baraba-ride/inventory/nowhere', '/baraba-ride/inventory'],
      ['/baraba-ride?product=BR-01', '/baraba-ride/catalog/products/BR-01'],
      ['/baraba-ride?view=parts', '/baraba-ride/catalog/parts'],
      ['/baraba-ride?view=parts&product=BR-01', '/baraba-ride/catalog/products/BR-01'],
    ])('sends %s to %s', (from, to) => {
      renderAt(from);
      expect(location()).toBe(to);
    });

    it('shows the product list after the default redirect', () => {
      renderAt('/baraba-ride');
      expect(screen.getByRole('region', { name: 'Products' })).toBeInTheDocument();
    });

    it('shows the product after an earlier product link', () => {
      renderAt('/baraba-ride?product=BR-01');
      expect(screen.getByRole('heading', { level: 2, name: 'Storm Falcon' })).toBeInTheDocument();
    });

    it('shows the parts view after an earlier parts link', () => {
      renderAt('/baraba-ride?view=parts');
      expect(screen.getByRole('region', { name: 'Parts' })).toBeInTheDocument();
    });
  });

  describe('catalog', () => {
    it('shows the product list with Products current', () => {
      renderAt('/baraba-ride/catalog');
      expect(screen.getByRole('heading', { level: 1, name: 'Baraba Ride' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Products' })).toBeInTheDocument();
      expect(catalogViews().getByRole('link', { name: 'Products' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(catalogViews().getByRole('link', { name: 'Parts' })).not.toHaveAttribute(
        'aria-current',
      );
    });

    it('keeps Products current on a product detail', () => {
      renderAt('/baraba-ride/catalog/products/BR-01');
      expect(catalogViews().getByRole('link', { name: 'Products' })).toHaveAttribute(
        'aria-current',
        'page',
      );
    });

    it('opens a product from the list and returns to it', async () => {
      const user = userEvent.setup();
      renderAt('/baraba-ride/catalog');
      await user.click(screen.getByRole('link', { name: /BR-03/ }));
      expect(location()).toBe('/baraba-ride/catalog/products/BR-03');
      expect(screen.getByRole('heading', { level: 2, name: 'Fury Lizard' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Named parts' })).toBeInTheDocument();

      await user.click(screen.getByRole('link', { name: /All products/ }));
      expect(location()).toBe('/baraba-ride/catalog');
      expect(screen.getByRole('region', { name: 'Products' })).toBeInTheDocument();
    });

    it('shows the parts view and links from a part to its product', async () => {
      const user = userEvent.setup();
      renderAt('/baraba-ride/catalog');
      await user.click(catalogViews().getByRole('link', { name: 'Parts' }));
      expect(location()).toBe('/baraba-ride/catalog/parts');
      expect(screen.getByRole('region', { name: 'Parts' })).toBeInTheDocument();
      expect(catalogViews().getByRole('link', { name: 'Parts' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(catalogViews().getByRole('link', { name: 'Products' })).not.toHaveAttribute(
        'aria-current',
      );

      const sources = screen.getByRole('list', { name: 'Dual Blade found in' });
      await user.click(within(sources).getByRole('link', { name: 'BR-08 Stallion Kit' }));
      expect(location()).toBe('/baraba-ride/catalog/products/BR-08');
      expect(screen.getByRole('heading', { level: 2, name: 'Stallion Kit' })).toBeInTheDocument();
    });

    it('opens the parts view by address', () => {
      renderAt('/baraba-ride/catalog/parts');
      expect(screen.getByRole('region', { name: 'Parts' })).toBeInTheDocument();
    });

    it('falls back to the list for an unknown product code', () => {
      renderAt('/baraba-ride/catalog/products/BR-99');
      expect(screen.getByText('No product with code BR-99.')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Products' })).toBeInTheDocument();
      expect(location()).toBe('/baraba-ride/catalog/products/BR-99');
    });
  });
});
