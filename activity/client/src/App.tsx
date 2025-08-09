import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import SimpleGamingHub from './pages/SimpleGamingHub';
import NotFound from './pages/NotFound';
import { useDiscord } from './contexts/DiscordContextDirect';
import LoadingScreen from './components/LoadingScreen';
import AuthenticationPrompt from './components/AuthenticationPrompt';
import DebugOverlay from './components/DebugOverlay';

const pageVariants = {
  initial: { opacity: 0, x: 300 },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: -300 }
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.5
};

export default function App() {
  const location = useLocation();
  const { isLoading, user, error } = useDiscord(); // Get the new error state
  const [hasSeenSetup, setHasSeenSetup] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      const userPrefs = localStorage.getItem(`opure_user_preferences_${user.id}`);
      setHasSeenSetup(!!userPrefs);
    }
  }, [user]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  // If there's an error, display it clearly
  if (error) {
    return (
      <div className="min-h-screen bg-red-900 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
        <p className="mb-4 text-center">Could not authenticate with Discord. This is likely an issue with the server-side token exchange.</p>
        <pre className="bg-black/30 p-4 rounded-md text-left w-full max-w-lg overflow-auto">
          {error}
        </pre>
      </div>
    );
  }

  if (!user) {
    return <AuthenticationPrompt />;
  }

  // Skip setup screen for now - go directly to main app
  if (!hasSeenSetup && false) {
    return <UserSetup />;
  }

  // SIMPLIFIED: Just show the Simple Gaming Hub directly
  return (
    <div className="min-h-screen overflow-hidden">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<SimpleGamingHub />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <DebugOverlay />
    </div>
  );
}
