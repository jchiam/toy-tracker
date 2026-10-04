import type { Meta, StoryObj } from '@storybook/react-vite';
import { AuthGate } from './AuthGate';

const meta: Meta<typeof AuthGate> = {
  title: 'Components/AuthGate',
  component: AuthGate,
  args: {
    onSignIn: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof AuthGate>;

export const Default: Story = {};
