import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { PartCatalog } from './PartCatalog';
import { ACCESSORIES, PARTS, PRODUCTS, PRODUCT_PARTS } from '@/lib/br/catalog';
import type { Part } from '@/lib/br/types';

function renderParts(parts: Part[] = PARTS) {
  return render(
    <MemoryRouter initialEntries={['/baraba-ride/catalog/parts']}>
      <PartCatalog parts={parts} products={PRODUCTS} productParts={PRODUCT_PARTS} />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('PartCatalog', () => {
  it('groups parts under their slot headings', () => {
    renderParts();
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Cowls', 'Bumpers', 'Tires', 'Chassis']);

    const bumpers = screen.getByRole('region', { name: 'Bumpers' });
    expect(
      within(bumpers)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(['Dual Blade', 'Wide Shield', 'Mega Launcher']);
  });

  it('lists no accessory, even though the mapping references them', () => {
    renderParts();
    expect(ACCESSORIES.length).toBeGreaterThan(0);
    for (const accessory of ACCESSORIES) {
      expect(screen.queryByRole('heading', { name: accessory.nameEn })).toBeNull();
    }
    expect(screen.queryByText(/charger/i)).toBeNull();
    expect(screen.queryByText(/colosseum/i)).toBeNull();
  });

  it('omits slots that have no parts', () => {
    renderParts(PARTS.filter((p) => p.slot !== 'chassis'));
    expect(screen.queryByRole('heading', { name: 'Chassis' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Tires' })).toBeInTheDocument();
  });

  it('lists the products containing a part, with quantities and links', () => {
    renderParts();
    const sources = screen.getByRole('list', { name: 'H36 found in' });
    expect(
      within(sources)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['BR-02 Lash Stallion × 4', 'BR-05 Lash Stallion × 4', 'BR-07 Falcon Kit × 4']);
    expect(within(sources).getByRole('link', { name: 'BR-07 Falcon Kit' })).toHaveAttribute(
      'href',
      '/baraba-ride/catalog/products/BR-07',
    );
  });

  it('notes parts that no product mapping references', () => {
    renderParts([
      ...PARTS,
      { id: 'bumper:prototype', slot: 'bumper', nameEn: 'Prototype', nameJa: 'プロトタイプ' },
    ]);
    const card = screen.getByRole('heading', { name: 'Prototype' }).closest('li')!;
    expect(within(card).getByText('Source product unknown')).toBeInTheDocument();
    expect(screen.getAllByText('Source product unknown')).toHaveLength(1);
  });

  it('shows each variant of a part in product-code order, with colour and product', () => {
    vi.stubEnv('VITE_IMAGEKIT_URL_ENDPOINT', 'https://ik.imagekit.io/example');
    renderParts();
    const variants = within(screen.getByRole('list', { name: 'Storm Falcon variants' }));
    expect(variants.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'WhiteBR-01',
      'RedBR-04',
      'BlackBR-07',
    ]);
    expect(variants.getByRole('img', { name: 'Storm Falcon, Red' }).getAttribute('src')).toMatch(
      /cm-extract:e-bgremove:w-256,c-at_max,bg-FFFFFF\/baraba_ride\/products\/BR_04\/3\.jpg$/,
    );
  });

  it('links a variant to the product it ships in', () => {
    renderParts();
    const variants = within(screen.getByRole('list', { name: 'Storm Falcon variants' }));
    expect(variants.getAllByRole('link')[2]).toHaveAttribute(
      'href',
      '/baraba-ride/catalog/products/BR-07',
    );
  });

  it('uses the first variant as the image of the part itself', () => {
    vi.stubEnv('VITE_IMAGEKIT_URL_ENDPOINT', 'https://ik.imagekit.io/example');
    renderParts();
    const card = screen.getByRole('heading', { name: 'Storm Falcon' }).closest('li')!;
    expect(within(card).getByRole('img', { name: 'Storm Falcon' }).getAttribute('src')).toBe(
      within(card).getByRole('img', { name: 'Storm Falcon, White' }).getAttribute('src'),
    );
  });

  it('shows a placeholder and no variants for a part with no recorded variant', () => {
    renderParts([
      ...PARTS,
      { id: 'bumper:prototype', slot: 'bumper', nameEn: 'Prototype', nameJa: 'プロトタイプ' },
    ]);
    const card = screen.getByRole('heading', { name: 'Prototype' }).closest('li')!;
    expect(within(card).getByRole('img', { name: 'Prototype' })).toHaveClass(
      'br-image-placeholder',
    );
    expect(within(card).queryByRole('list', { name: 'Prototype variants' })).toBeNull();
  });
});
