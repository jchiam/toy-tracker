import { Suspense } from 'react';
import { Routes, Route } from 'react-router';
import { GAMES } from '@/lib/games';
import { Navbar } from '@/components/Navbar';
import { SelectionPage } from '@/pages/SelectionPage';
import { useAuth } from '@/hooks/useAuth';
import './App.css';

function App() {
  const { session, isAuthLoading, signInWithGoogle, signOut } = useAuth();

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
              path={game.path}
              element={
                <game.Page
                  session={session}
                  isAuthLoading={isAuthLoading}
                  onSignIn={() => signInWithGoogle(game.path)}
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
