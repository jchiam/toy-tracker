import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { GameSwitcher } from './GameSwitcher';

const meta: Meta<typeof GameSwitcher> = {
  title: 'Components/GameSwitcher',
  component: GameSwitcher,
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/baraba-ride']}>
        <div style={{ padding: '1rem' }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GameSwitcher>;

export const Default: Story = {};
