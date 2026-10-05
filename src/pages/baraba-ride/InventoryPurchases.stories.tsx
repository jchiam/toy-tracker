import type { Meta, StoryObj } from '@storybook/react-vite';
import { InventoryPurchases } from './InventoryPurchases';
import { makeInstance, makeInventory, makePurchase } from '@/test/br-inventory';
import './BrPage.css';

const meta: Meta<typeof InventoryPurchases> = {
  title: 'Baraba Ride/InventoryPurchases',
  component: InventoryPurchases,
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
type Story = StoryObj<typeof InventoryPurchases>;

export const Populated: Story = {
  args: {
    inventory: makeInventory({
      purchases: [
        makePurchase({
          id: 'p1',
          productCode: 'BR-01',
          acquiredAt: '2026-09-19',
          note: 'Launch day',
        }),
        makePurchase({ id: 'p2', productCode: 'BR-10', acquiredAt: '2026-09-26' }),
      ],
      instances: [
        makeInstance({ itemId: 'cowl:storm-falcon', purchaseId: 'p1' }),
        makeInstance({ itemId: 'bumper:dual-blade', purchaseId: 'p1' }),
        makeInstance({ itemId: 'tire:rw32', purchaseId: 'p1' }),
        makeInstance({ itemId: 'tire:rw32', purchaseId: 'p1', status: 'retired', note: 'cracked' }),
        makeInstance({ itemId: 'charger:ride-charger', purchaseId: 'p1' }),
        makeInstance({
          itemId: 'colosseum:fold-colosseum',
          purchaseId: 'p2',
          variantProductCode: 'BR-10',
        }),
      ],
    }),
  },
};

export const Empty: Story = {
  args: { inventory: makeInventory() },
};

export const PhoneWidth: Story = {
  ...Populated,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
