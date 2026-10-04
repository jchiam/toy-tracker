import { Link } from 'react-router';
import { GameSwitcher } from './GameSwitcher';
import './Navbar.css';

interface NavbarProps {
  userEmail?: string;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function Navbar({ userEmail, onSignIn, onSignOut }: NavbarProps) {
  return (
    <nav className="navbar">
      <div className="nav-left">
        <GameSwitcher />
        <Link to="/" className="nav-brand">
          <img src="/brand-logo.webp" alt="JC" className="brand-logo" />
          The JonZone Toy Zone
        </Link>
      </div>
      <div className="nav-auth">
        {userEmail ? (
          <>
            <span className="user-email">{userEmail}</span>
            <button className="btn secondary-action" onClick={onSignOut}>
              Sign Out
            </button>
          </>
        ) : (
          <button className="btn primary-action" onClick={onSignIn}>
            Sign In with Google
          </button>
        )}
      </div>
    </nav>
  );
}
