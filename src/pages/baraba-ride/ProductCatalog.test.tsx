import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ProductCatalog } from './ProductCatalog';
import { PRODUCTS } from '@/lib/br/catalog';

function renderCatalog() {
  return render(
    <MemoryRouter initialEntries={['/baraba-ride']}>
      <ProductCatalog products={PRODUCTS} />
    </MemoryRouter>,
  );
}

const listedCodes = () =>
  screen.queryAllByRole('link').map((link) => link.querySelector('.br-code')?.textContent);

const filter = (group: string, name: string) =>
  within(screen.getByRole('group', { name: group })).getByRole('button', { name });

afterEach(cleanup);

describe('ProductCatalog', () => {
  it('lists the launch lineup in code order', () => {
    renderCatalog();
    expect(listedCodes()).toEqual([
      'BR-01',
      'BR-02',
      'BR-03',
      'BR-04',
      'BR-05',
      'BR-06',
      'BR-07',
      'BR-08',
      'BR-09',
      'BR-10',
    ]);
  });

  it('shows name, type, style, price and release date on each card', () => {
    renderCatalog();
    const card = screen.getByRole('link', { name: /BR-07/ });
    expect(within(card).getByRole('heading', { name: 'Falcon Kit' })).toBeInTheDocument();
    expect(within(card).getByText('Booster Set')).toBeInTheDocument();
    expect(within(card).getByText('Spin')).toBeInTheDocument();
    expect(within(card).getByText('¥1,540 incl. tax')).toBeInTheDocument();
    expect(within(card).getByText('Sep 19, 2026')).toBeInTheDocument();
    expect(card).toHaveAttribute('href', '/baraba-ride?product=BR-07');
  });

  it('lists a tool without a style badge', () => {
    renderCatalog();
    const card = screen.getByRole('link', { name: /BR-10/ });
    expect(within(card).getByText('Tool')).toBeInTheDocument();
    expect(card.querySelector('.br-badge-style')).toBeNull();
  });

  it('filters by style', async () => {
    const user = userEvent.setup();
    renderCatalog();
    await user.click(filter('Style', 'Spin'));
    expect(listedCodes()).toEqual(['BR-02', 'BR-05', 'BR-07']);
  });

  it('combines type and style filters', async () => {
    const user = userEvent.setup();
    renderCatalog();
    await user.click(filter('Style', 'Spin'));
    await user.click(filter('Type', 'Starter Set'));
    expect(listedCodes()).toEqual(['BR-02', 'BR-05']);
  });

  it('shows an empty state when nothing matches', async () => {
    const user = userEvent.setup();
    renderCatalog();
    await user.click(filter('Type', 'Tool'));
    await user.click(filter('Style', 'Dash'));
    expect(screen.getByText('No products match these filters.')).toBeInTheDocument();
    expect(listedCodes()).toEqual([]);
  });

  it('restores the full list when filters are cleared', async () => {
    const user = userEvent.setup();
    renderCatalog();
    await user.click(filter('Type', 'Tool'));
    await user.click(filter('Style', 'Dash'));
    await user.click(filter('Type', 'All'));
    await user.click(filter('Style', 'All'));
    expect(listedCodes()).toHaveLength(PRODUCTS.length);
  });
});
