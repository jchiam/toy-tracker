import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { ProductCatalog } from './ProductCatalog';
import { PRODUCTS } from '@/lib/br/catalog';
import './BrPage.css';

const meta: Meta<typeof ProductCatalog> = {
  title: 'Baraba Ride/ProductCatalog',
  component: ProductCatalog,
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
type Story = StoryObj<typeof ProductCatalog>;

export const LaunchLineup: Story = {
  args: { products: PRODUCTS },
};

export const Empty: Story = {
  args: { products: [] },
};
