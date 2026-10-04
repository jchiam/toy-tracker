import './AuthGate.css';

interface AuthGateProps {
  onSignIn: () => void;
}

export function AuthGate({ onSignIn }: AuthGateProps) {
  return (
    <div className="auth-gate">
      <h2>Welcome to the Toy Zone</h2>
      <p>
        Securely sync your toy collections and custom builds across all your devices using Google
        Authentication.
      </p>
      <button className="btn primary-action auth-gate-btn" onClick={onSignIn}>
        Sign In with Google
      </button>
    </div>
  );
}
