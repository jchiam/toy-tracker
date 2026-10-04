import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { Navbar } from './Navbar';

const meta: Meta<typeof Navbar> = {
  title: 'Components/Navbar',
  component: Navbar,
  parameters: { layout: 'fullscreen' },
  args: {
    onSignIn: () => {},
    onSignOut: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof Navbar>;

export const OnLandingPage: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <Story />
      </MemoryRouter>
    ),
  ],
};

export const OnGamePage: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/baraba-ride']}>
        <Story />
      </MemoryRouter>
    ),
  ],
};

export const SignedIn: Story = {
  args: {
    userEmail: 'trainer@example.com',
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <Story />
      </MemoryRouter>
    ),
  ],
};
