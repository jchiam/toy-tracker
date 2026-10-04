import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ProductDetail } from './ProductDetail';
import { PRODUCTS, resolveProductParts } from '@/lib/br/catalog';

const product = (code: string) => PRODUCTS.find((p) => p.code === code)!;

function renderDetail(code: string, mapped = true) {
  return render(
    <MemoryRouter initialEntries={[`/baraba-ride/catalog/products/${code}`]}>
      <ProductDetail product={product(code)} parts={mapped ? resolveProductParts(code) : null} />
    </MemoryRouter>,
  );
}

const ENDPOINT = 'https://ik.imagekit.io/example';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('ProductDetail', () => {
  it('shows the product facts and slot-level contents', () => {
    renderDetail('BR-01');
    expect(screen.getByRole('heading', { name: 'Storm Falcon' })).toBeInTheDocument();
    expect(screen.getByText('ストームファルコン')).toBeInTheDocument();
    expect(screen.getByText('Starter Set')).toBeInTheDocument();
    expect(screen.getByText('Upper')).toBeInTheDocument();

    const box = screen.getByRole('region', { name: 'In the box' });
    expect(within(box).getByText('Tire × 4')).toBeInTheDocument();
    expect(within(box).getByText('Ride Charger × 1')).toBeInTheDocument();
  });

  it('lists the named cowl, bumper, tires and chassis of a mapped product', () => {
    renderDetail('BR-01');
    const named = screen.getByRole('region', { name: 'Named parts' });
    const items = within(named)
      .getAllByRole('listitem')
      .map((li) => li.textContent);
    expect(items).toEqual([
      'Cowl Storm Falcon × 1 · White',
      'Bumper Dual Blade × 1 · Red',
      'Tire RW32 × 2 · Red',
      'Tire LW32 × 2 · Red',
      'Chassis Alpha × 1 · Red',
    ]);
  });

  it('shows every recorded shot in order, each opening the full shot', () => {
    vi.stubEnv('VITE_IMAGEKIT_URL_ENDPOINT', ENDPOINT);
    renderDetail('BR-01');
    const shots = within(screen.getByRole('list', { name: 'Product shots' })).getAllByRole('img');
    expect(shots.map((img) => img.getAttribute('alt'))).toEqual(
      [1, 2, 3, 4, 5].map((n) => `Storm Falcon, shot ${n} of 5`),
    );
    expect(shots.map((img) => img.getAttribute('src'))).toEqual(
      [1, 2, 3, 4, 5].map(
        (n) => `${ENDPOINT}/tr:w-480,c-at_max/baraba_ride/products/BR_01/${n}.jpg`,
      ),
    );
    expect(shots[2].closest('a')).toHaveAttribute(
      'href',
      `${ENDPOINT}/tr:w-1200,c-at_max/baraba_ride/products/BR_01/3.jpg`,
    );
  });

  it('shows shot placeholders, unlinked, when the image CDN is not configured', () => {
    renderDetail('BR-07');
    const shots = within(screen.getByRole('list', { name: 'Product shots' })).getAllByRole('img');
    expect(shots).toHaveLength(4);
    for (const shot of shots) {
      expect(shot.tagName).toBe('SPAN');
      expect(shot.closest('a')).toBeNull();
    }
  });

  it('pictures a named part with its variant crop and colour', () => {
    vi.stubEnv('VITE_IMAGEKIT_URL_ENDPOINT', ENDPOINT);
    renderDetail('BR-07');
    const named = screen.getByRole('region', { name: 'Named parts' });
    const cowl = within(named).getByRole('img', { name: 'Storm Falcon, Black' });
    expect(cowl.getAttribute('src')).toMatch(
      /tr:x-\d+,y-\d+,w-\d+,h-\d+,cm-extract:e-bgremove:w-256,c-at_max,bg-FFFFFF\/baraba_ride\/products\/BR_07\/3\.jpg$/,
    );
  });

  it('lists a named part without a variant by name and quantity only', () => {
    const parts = resolveProductParts('BR-01')!.map(({ part, quantity }) => ({ part, quantity }));
    render(
      <MemoryRouter>
        <ProductDetail product={product('BR-01')} parts={parts} />
      </MemoryRouter>,
    );
    const named = screen.getByRole('region', { name: 'Named parts' });
    expect(within(named).queryByRole('img')).toBeNull();
    expect(within(named).getAllByRole('listitem')[0].textContent).toBe('Cowl Storm Falcon × 1');
  });

  it('shows only slot-level counts for an unmapped product', () => {
    renderDetail('BR-01', false);
    expect(screen.getByRole('region', { name: 'In the box' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Named parts' })).toBeNull();
    expect(screen.queryByText(/Dual Blade/)).toBeNull();
  });

  it('links to the official product page', () => {
    renderDetail('BR-01');
    const link = screen.getByRole('link', { name: /Official product page/ });
    expect(link).toHaveAttribute('href', 'https://toy.bandai.co.jp/ja/item/01_21000/');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('links to the official instruction manual in a new tab', () => {
    renderDetail('BR-01');
    const link = screen.getByRole('link', { name: /Instruction manual/ });
    expect(link).toHaveAttribute('href', 'https://toy.bandai.co.jp/manuals/pdf.php?id=2852278');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows no manual link for a product without one', () => {
    render(
      <MemoryRouter>
        <ProductDetail product={{ ...product('BR-01'), manualUrl: undefined }} parts={null} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: /Instruction manual/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Official product page/ })).toBeInTheDocument();
  });

  it('links back to the product list', () => {
    renderDetail('BR-01');
    expect(screen.getByRole('link', { name: /All products/ })).toHaveAttribute(
      'href',
      '/baraba-ride/catalog',
    );
  });
});
