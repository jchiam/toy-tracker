import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthGate } from './AuthGate';

afterEach(cleanup);

describe('AuthGate', () => {
  it('renders the welcome heading and sign-in button', () => {
    render(<AuthGate onSignIn={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Welcome to the Toy Zone' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In with Google' })).toBeInTheDocument();
  });

  it('fires onSignIn when the button is clicked', async () => {
    const user = userEvent.setup();
    const onSignIn = vi.fn();
    render(<AuthGate onSignIn={onSignIn} />);

    await user.click(screen.getByRole('button', { name: 'Sign In with Google' }));

    expect(onSignIn).toHaveBeenCalledTimes(1);
  });
});
