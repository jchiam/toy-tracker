import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Navbar } from './Navbar';

function renderAt(
  path: string,
  {
    userEmail,
    onSignIn = vi.fn(),
    onSignOut = vi.fn(),
  }: { userEmail?: string; onSignIn?: () => void; onSignOut?: () => void } = {},
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar userEmail={userEmail} onSignIn={onSignIn} onSignOut={onSignOut} />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('Navbar', () => {
  it('renders the brand as a link home on the landing page', () => {
    renderAt('/');
    const brand = screen.getByRole('link', { name: /The JonZone Toy Zone/ });
    expect(brand).toHaveAttribute('href', '/');
  });

  it('renders the brand on game routes', () => {
    renderAt('/baraba-ride');
    expect(screen.getByRole('link', { name: /The JonZone Toy Zone/ })).toBeInTheDocument();
  });

  it('shows a sign-in button when signed out and fires onSignIn', async () => {
    const user = userEvent.setup();
    const onSignIn = vi.fn();
    renderAt('/', { onSignIn });

    expect(screen.queryByText(/Sign Out/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Sign In with Google' }));

    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('shows the user email and sign-out button when signed in', async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();
    renderAt('/', { userEmail: 'test@example.com', onSignOut });

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.queryByText(/Sign In/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Sign Out' }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
