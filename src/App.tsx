import { Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router';
import { GAMES } from '@/lib/games';
import { Navbar } from '@/components/Navbar';
import { SelectionPage } from '@/pages/SelectionPage';
import { useAuth } from '@/hooks/useAuth';
import './App.css';

function App() {
  const { session, isAuthLoading, signInWithGoogle, signOut } = useAuth();
  // The gate signs in back to the address that was opened, so deep links survive.
  const { pathname, search } = useLocation();

  return (
    <>
      <Navbar
        userEmail={session?.user?.email}
        onSignIn={() => signInWithGoogle()}
        onSignOut={() => signOut()}
      />
      <Suspense fallback={<div className="main-content">Loading...</div>}>
        <Routes>
          <Route
            path="/"
            element={
              <SelectionPage
                session={session}
                isAuthLoading={isAuthLoading}
                signInWithGoogle={signInWithGoogle}
              />
            }
          />
          {GAMES.map((game) => (
            <Route
              key={game.id}
              path={`${game.path}/*`}
              element={
                <game.Page
                  session={session}
                  isAuthLoading={isAuthLoading}
                  onSignIn={() => signInWithGoogle(pathname + search)}
                />
              }
            />
          ))}
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
