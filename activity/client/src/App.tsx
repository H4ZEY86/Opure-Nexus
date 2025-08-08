import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import HomeNew from './pages/HomeNew';
import MusicAdvanced from './pages/MusicAdvanced';
import UserSetup from './pages/UserSetup';
import BotCommands from './pages/BotCommands';
import Settings from './pages/Settings';
import GameHub from './pages/GameHub';
import Achievements from './pages/Achievements';
import Economy from './pages/Economy';
import AIChat from './pages/AIChat';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';
import { useDiscord } from './contexts/DiscordContextDirect';
import LoadingScreen from './components/common/LoadingScreen';
import AuthenticationPrompt from './components/auth/AuthenticationPrompt';
import DebugOverlay from './components/DebugOverlay';

// ... (pageVariants and pageTransition remain the same)

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

  if (!hasSeenSetup) {
    return <UserSetup />;
  }

  // ... (the rest of your App.tsx JSX remains the same)
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-hidden">
      {/* ... rest of your JSX ... */}
      <DebugOverlay />
    </div>
  );
}
