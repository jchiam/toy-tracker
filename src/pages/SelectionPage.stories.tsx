import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import type { Session } from '@supabase/supabase-js';
import { SelectionPage } from './SelectionPage';

const mockSession = {
  user: { id: 'storybook-user', email: 'trainer@example.com' },
} as unknown as Session;

const meta: Meta<typeof SelectionPage> = {
  title: 'Pages/SelectionPage',
  component: SelectionPage,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    isAuthLoading: false,
    signInWithGoogle: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof SelectionPage>;

export const SignedIn: Story = {
  args: { session: mockSession },
};

export const SignedOut: Story = {
  args: { session: null },
};

export const AuthLoading: Story = {
  args: { session: null, isAuthLoading: true },
};
