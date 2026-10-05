import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { BuildView } from './BuildView';
import { TIRE_POSITIONS } from '@/lib/br/build-types';
import { makeInstance, makeInventory } from '@/test/br-inventory';
import { claim, makeBuild, makeBuildsState, wish } from '@/test/br-builds';
import './BrPage.css';

const meta: Meta<typeof BuildView> = {
  title: 'Baraba Ride/BuildView',
  component: BuildView,
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
type Story = StoryObj<typeof BuildView>;

const bumper = makeInstance({ itemId: 'bumper:dual-blade', variantProductCode: 'BR-01' });
const cowl = makeInstance({ itemId: 'cowl:storm-falcon', variantProductCode: 'BR-01' });
const chassis = makeInstance({ itemId: 'chassis:alpha', variantProductCode: 'BR-01' });
const tires = [
  makeInstance({ itemId: 'tire:rw32', variantProductCode: 'BR-01' }),
  makeInstance({ itemId: 'tire:lw32', variantProductCode: 'BR-01' }),
  makeInstance({ itemId: 'tire:rw32', variantProductCode: 'BR-01', note: 'scuffed' }),
  makeInstance({ itemId: 'tire:lw32', variantProductCode: null }),
];
const spares = [
  makeInstance({ itemId: 'tire:h36', variantProductCode: 'BR-02' }),
  makeInstance({ itemId: 'tire:h36', variantProductCode: 'BR-02' }),
  makeInstance({ itemId: 'cowl:lash-stallion', variantProductCode: 'BR-02' }),
];
const instances = [bumper, cowl, chassis, ...tires, ...spares];

const redDash = makeBuild({
  name: 'Red Dash',
  status: 'built',
  note: 'Tournament machine',
  parts: [
    claim('bumper', bumper),
    claim('cowl', cowl),
    claim('chassis', chassis),
    ...TIRE_POSITIONS.map((position, n) => claim(position, tires[n])),
  ],
});

// Shows every check state: available, in use by Red Dash, missing, and empty.
const incomplete = makeBuild({
  name: 'Silver idea',
  parts: [
    wish('cowl', 'cowl:lash-stallion'),
    wish('chassis', 'chassis:alpha'),
    wish('tire_fl', 'tire:h36'),
    wish('tire_fr', 'tire:h36'),
    wish('tire_rl', 'tire:h36', 'BR-07'),
    wish('tire_rr', 'tire:h36', 'BR-07'),
  ],
});

const state = makeBuildsState({ builds: [redDash, incomplete] });
const inventory = makeInventory({ instances });

export const IncompletePlan: Story = {
  args: { build: incomplete, builds: state, inventory },
};

export const Built: Story = {
  args: { build: redDash, builds: state, inventory },
};

export const WriteFailed: Story = {
  args: {
    build: incomplete,
    builds: makeBuildsState({
      builds: [redDash, incomplete],
      error: 'Could not set position: network down',
    }),
    inventory,
  },
};

export const PhoneWidth: Story = {
  ...IncompletePlan,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
