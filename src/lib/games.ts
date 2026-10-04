import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import type { Session } from '@supabase/supabase-js';

/** Props App passes to every lazy game page; pages gate on `session` via AuthGate. */
export interface GamePageProps {
  session: Session | null;
  isAuthLoading: boolean;
  onSignIn: () => void;
}

export interface Game {
  /** Short game id used in tokens, CSS classes, and future table prefixes: 'br'. */
  id: string;
  name: string;
  /** Route path; each card navigates here. */
  path: string;
  publisher: string;
  description: string;
  /** Game accent colour (metadata for future switcher/badges). */
  accent: string;
  /** GameSwitcher trigger/dropdown icon, self-hosted under public/assets/icons/. */
  icon: string;
  /** SelectionPage card cover image, self-hosted under public/assets/. Null until art is sourced. */
  coverImage: string | null;
  /** SelectionPage card header background class from index.css (`bg-<id>-sel`). */
  bgClass: string;
  Page: LazyExoticComponent<ComponentType<GamePageProps>>;
}

/**
 * Single source of truth for the toy line roster. Adding a game here wires it into
 * the router and the SelectionPage grid at once; pair it with a `color.<id>`
 * token group and a `bg-<id>-sel` class in index.css.
 */
export const GAMES: Game[] = [
  {
    id: 'br',
    name: 'Baraba Ride',
    path: '/baraba-ride',
    publisher: 'Bandai',
    description: 'Track your machines, parts, and custom builds across the BR lineup.',
    accent: '#ff5a1f',
    icon: '/assets/icons/br-icon.webp',
    coverImage: '/assets/baraba-ride/cover.webp',
    bgClass: 'bg-br-sel',
    Page: lazy(() => import('@/pages/baraba-ride/BrPage').then((m) => ({ default: m.BrPage }))),
  },
];
