import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { Session } from '@supabase/supabase-js';
import { GAMES } from '@/lib/games';
import type { Game } from '@/lib/games';
import './SelectionPage.css';

interface SelectionPageProps {
  session: Session | null;
  isAuthLoading: boolean;
  signInWithGoogle: (path: string) => void;
}

function GameCard({
  game,
  isSignedIn,
  onSelect,
}: {
  game: Game;
  isSignedIn: boolean;
  onSelect: (path: string) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <button onClick={() => onSelect(game.path)} className="selection-card">
      <div className={`selection-card-header ${game.bgClass}`}>
        {game.coverImage && !imageFailed && (
          <img
            src={game.coverImage}
            alt=""
            className="game-cover-image"
            onError={() => setImageFailed(true)}
          />
        )}
        <div className="selection-card-overlay"></div>

        {!isSignedIn && (
          <div className="selection-card-badges">
            <span className="requires-login-badge">Requires Login</span>
          </div>
        )}
      </div>

      <div className="selection-card-body">
        <div className="game-title-row">
          <h2 className="game-name">{game.name}</h2>
          <span className="game-tag-badge">{game.publisher}</span>
        </div>
        <p className="game-description">{game.description}</p>
      </div>
    </button>
  );
}

export function SelectionPage({ session, isAuthLoading, signInWithGoogle }: SelectionPageProps) {
  const navigate = useNavigate();

  // Signed-out selections round-trip through Google OAuth and land back on the
  // chosen game's route.
  const handleGameSelect = (path: string) => {
    if (!session) {
      signInWithGoogle(path);
    } else {
      navigate(path);
    }
  };

  if (isAuthLoading) {
    return (
      <main className="main-content selection-content">
        <p>Checking authentication...</p>
      </main>
    );
  }

  return (
    <main className="main-content selection-content">
      <header className="selection-hero">
        <h1 className="selection-title">The JonZone Toy Zone</h1>
        <p className="selection-subtitle">
          Choose a game to track your collection and custom builds.
        </p>
      </header>

      <section className="selection-grid">
        {GAMES.map((game) => (
          <GameCard key={game.id} game={game} isSignedIn={!!session} onSelect={handleGameSelect} />
        ))}
      </section>

      <footer className="selection-attribution">
        Baraba Ride ©BANDAI. This is an unofficial fan project; all trademarks belong to their
        respective owners.
      </footer>
    </main>
  );
}
