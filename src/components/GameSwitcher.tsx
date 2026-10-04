import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { GAMES } from '@/lib/games';
import './GameSwitcher.css';

export function GameSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't show on the selection page - must come after hooks
  if (location.pathname === '/') return null;

  const currentGame = GAMES.find((g) => location.pathname.startsWith(g.path));

  return (
    <div className="game-switcher" ref={dropdownRef}>
      <button
        className={`switcher-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Switch Game"
      >
        <div className="current-game-icon-container">
          <img src={currentGame?.icon} alt="" className="current-game-icon-img" />
        </div>
        <span className="chevron">▾</span>
      </button>

      {isOpen && (
        <div className="switcher-dropdown">
          <div className="dropdown-header">Switch Game</div>
          <div className="dropdown-list">
            {GAMES.map((game) => (
              <Link
                key={game.id}
                to={game.path}
                className={`dropdown-item ${location.pathname.startsWith(game.path) ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <div className="game-icon-container">
                  <img src={game.icon} alt="" className="game-icon-img" />
                </div>
                <span className="switcher-game-name">{game.name}</span>
                {location.pathname.startsWith(game.path) && (
                  <span className="active-indicator">●</span>
                )}
              </Link>
            ))}
          </div>
          <div className="dropdown-footer">
            <Link to="/" className="back-link" onClick={() => setIsOpen(false)}>
              Back to Selection
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
