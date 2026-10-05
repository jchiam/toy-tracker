import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { InstanceList } from './InstanceList';
import { claims } from '@/lib/br/builds';
import { claim, makeBuild } from '@/test/br-builds';
import type { Instance, Purchase } from '@/lib/br/inventory-types';
import './BrPage.css';

const purchase: Purchase = {
  id: 'p1',
  profileId: 'u',
  productCode: 'BR-01',
  acquiredAt: '2026-10-01',
  note: '',
  createdAt: '2026-10-01T00:00:00Z',
};

const instance = (overrides: Partial<Instance>): Instance => ({
  id: 'i1',
  profileId: 'u',
  itemId: 'tire:rw32',
  variantProductCode: 'BR-01',
  purchaseId: 'p1',
  status: 'active',
  condition: null,
  note: '',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  ...overrides,
});

const noop = async () => {};

const meta: Meta<typeof InstanceList> = {
  title: 'Baraba Ride/InstanceList',
  component: InstanceList,
  decorators: [
    (Story) => (
      <main className="main-content">
        <Story />
      </main>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    label: 'RW32',
    purchases: [purchase],
    actions: { onRetire: noop, onReactivate: noop, onDelete: noop },
  },
};

export default meta;
type Story = StoryObj<typeof InstanceList>;

export const Mixed: Story = {
  args: {
    instances: [
      instance({ id: 'i1' }),
      instance({ id: 'i2', variantProductCode: 'BR-03', purchaseId: null }),
      instance({ id: 'i3', variantProductCode: null, purchaseId: null }),
      instance({ id: 'i4', status: 'retired', note: 'cracked on the rim' }),
    ],
  },
};

const held = instance({ id: 'i5' });

/** Retire and delete are unavailable for the instance a built build holds. */
export const HeldByBuild: Story = {
  args: {
    instances: [held, instance({ id: 'i6' })],
    claims: claims([
      makeBuild({ name: 'Red Dash', status: 'built', parts: [claim('tire_fl', held)] }),
    ]),
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};

export const PhoneWidth: Story = {
  ...Mixed,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
