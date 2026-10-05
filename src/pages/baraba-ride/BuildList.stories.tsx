import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { BuildList } from './BuildList';
import { TIRE_POSITIONS } from '@/lib/br/build-types';
import { makeInstance, makeInventory } from '@/test/br-inventory';
import { claim, makeBuild, makeBuildsState, wish } from '@/test/br-builds';
import './BrPage.css';

const meta: Meta<typeof BuildList> = {
  title: 'Baraba Ride/BuildList',
  component: BuildList,
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
type Story = StoryObj<typeof BuildList>;

const heldChassis = makeInstance({ itemId: 'chassis:alpha', variantProductCode: 'BR-01' });
const instances = [
  heldChassis,
  makeInstance({ itemId: 'chassis:alpha', variantProductCode: 'BR-02' }),
  makeInstance({ itemId: 'bumper:wide-shield', variantProductCode: 'BR-02' }),
  makeInstance({ itemId: 'cowl:lash-stallion', variantProductCode: 'BR-02' }),
  ...TIRE_POSITIONS.map(() => makeInstance({ itemId: 'tire:h36', variantProductCode: 'BR-02' })),
];

const fullWishes = (tire: string) => [
  wish('bumper', 'bumper:wide-shield'),
  wish('cowl', 'cowl:lash-stallion'),
  wish('chassis', 'chassis:alpha'),
  ...TIRE_POSITIONS.map((position) => wish(position, tire)),
];

export const Populated: Story = {
  args: {
    inventory: makeInventory({ instances }),
    builds: makeBuildsState({
      builds: [
        makeBuild({ name: 'Red Dash', status: 'built', parts: [claim('chassis', heldChassis)] }),
        makeBuild({ name: 'Blue Spin', parts: fullWishes('tire:h36') }),
        makeBuild({ name: 'Green idea', parts: fullWishes('tire:c36') }),
        makeBuild({ name: 'Sketch', parts: [wish('cowl', 'cowl:fury-lizard')] }),
      ],
    }),
  },
};

export const Empty: Story = {
  args: { inventory: makeInventory(), builds: makeBuildsState() },
};

export const Loading: Story = {
  args: { inventory: makeInventory(), builds: makeBuildsState({ loading: true }) },
};

export const LoadFailed: Story = {
  args: {
    inventory: makeInventory(),
    builds: makeBuildsState({ error: 'Could not load builds: network down' }),
  },
};

export const PhoneWidth: Story = {
  ...Populated,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
