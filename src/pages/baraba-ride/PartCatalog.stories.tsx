import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { PartCatalog } from './PartCatalog';
import { PARTS, PRODUCTS, PRODUCT_PARTS } from '@/lib/br/catalog';
import './BrPage.css';

const meta: Meta<typeof PartCatalog> = {
  title: 'Baraba Ride/PartCatalog',
  component: PartCatalog,
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
  args: { products: PRODUCTS, productParts: PRODUCT_PARTS },
};

export default meta;
type Story = StoryObj<typeof PartCatalog>;

export const AllParts: Story = {
  args: { parts: PARTS },
};

export const UnknownSource: Story = {
  args: {
    parts: [
      ...PARTS,
      { id: 'bumper:prototype', slot: 'bumper', nameEn: 'Prototype', nameJa: 'プロトタイプ' },
    ],
  },
};
