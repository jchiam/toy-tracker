import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { ProductDetail } from './ProductDetail';
import { PRODUCTS, resolveProductParts } from '@/lib/br/catalog';
import './BrPage.css';

const product = (code: string) => PRODUCTS.find((p) => p.code === code)!;

const meta: Meta<typeof ProductDetail> = {
  title: 'Baraba Ride/ProductDetail',
  component: ProductDetail,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <main className="main-content">
          <Story />
        </main>
      </MemoryRouter>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ProductDetail>;

export const StarterSet: Story = {
  args: { product: product('BR-01'), parts: resolveProductParts('BR-01') },
};

export const BoosterSet: Story = {
  args: { product: product('BR-07'), parts: resolveProductParts('BR-07') },
};

export const Tool: Story = {
  args: { product: product('BR-10'), parts: resolveProductParts('BR-10') },
};

export const Unmapped: Story = {
  args: { product: product('BR-01'), parts: null },
};

export const NoManual: Story = {
  args: { product: { ...product('BR-01'), manualUrl: undefined }, parts: null },
};
