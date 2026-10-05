import type { Meta, StoryObj } from '@storybook/react-vite';
import { InventoryItems } from './InventoryItems';
import { makeInstance, makeInventory, makePurchase } from '@/test/br-inventory';
import './BrPage.css';

const meta: Meta<typeof InventoryItems> = {
  title: 'Baraba Ride/InventoryItems',
  component: InventoryItems,
  decorators: [
    (Story) => (
      <main className="main-content">
        <Story />
      </main>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof InventoryItems>;

const purchase = makePurchase({ id: 'p1', productCode: 'BR-01', acquiredAt: '2026-09-19' });

export const Populated: Story = {
  args: {
    inventory: makeInventory({
      purchases: [purchase],
      instances: [
        makeInstance({ itemId: 'cowl:storm-falcon', purchaseId: 'p1' }),
        makeInstance({ itemId: 'bumper:dual-blade', purchaseId: 'p1' }),
        makeInstance({ itemId: 'tire:rw32', purchaseId: 'p1' }),
        makeInstance({ itemId: 'tire:rw32', purchaseId: 'p1', status: 'retired', note: 'cracked' }),
        makeInstance({ itemId: 'tire:rw32', variantProductCode: 'BR-09' }),
        makeInstance({ itemId: 'chassis:alpha', purchaseId: 'p1' }),
        makeInstance({ itemId: 'charger:ride-charger', purchaseId: 'p1' }),
        makeInstance({ itemId: 'colosseum:fold-colosseum', variantProductCode: 'BR-10' }),
        makeInstance({ itemId: 'cowl:ghost', variantProductCode: null }),
      ],
    }),
  },
};

export const Empty: Story = {
  args: { inventory: makeInventory() },
};

export const Loading: Story = {
  args: { inventory: makeInventory({ loading: true }) },
};

export const LoadFailed: Story = {
  args: { inventory: makeInventory({ error: 'Could not load inventory: network down' }) },
};

export const PhoneWidth: Story = {
  ...Populated,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
