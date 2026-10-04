import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ProductDetail } from './ProductDetail';
import { PRODUCTS, resolveProductParts } from '@/lib/br/catalog';

const product = (code: string) => PRODUCTS.find((p) => p.code === code)!;

function renderDetail(code: string, mapped = true) {
  return render(
    <MemoryRouter initialEntries={[`/baraba-ride?product=${code}`]}>
      <ProductDetail product={product(code)} parts={mapped ? resolveProductParts(code) : null} />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

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
      'Cowl Storm Falcon × 1',
      'Bumper Dual Blade × 1',
      'Tire RW32 × 2',
      'Tire LW32 × 2',
      'Chassis Alpha × 1',
    ]);
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

  it('links back to the product list', () => {
    renderDetail('BR-01');
    expect(screen.getByRole('link', { name: /All products/ })).toHaveAttribute(
      'href',
      '/baraba-ride',
    );
  });
});
