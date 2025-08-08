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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-hidden">
      
      {/* Edge Navigation */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Top Edge - User Info */}
        <div className="absolute top-0 left-0 right-0 h-20 hover-trigger group">
          <motion.div 
            initial={{ y: -80 }}
            animate={{ y: 0 }}
            className="w-full h-20 bg-black/40 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-auto"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold">
                {user?.username?.[0] || 'O'}
              </div>
              <div>
                <h3 className="text-white font-semibold">Welcome, {user?.username || 'User'}!</h3>
                <p className="text-white/60 text-sm">Opure Discord Activity</p>
              </div>
            </div>
            <div className="text-white/80">
              <p className="text-sm">ID: {user?.id}</p>
            </div>
          </motion.div>
        </div>

        {/* Left Edge - Main Navigation */}
        <div className="absolute left-0 top-20 bottom-0 w-20 hover-trigger group">
          <motion.div 
            initial={{ x: -200 }}
            animate={{ x: 0 }}
            className="w-64 h-full bg-black/40 backdrop-blur-xl border-r border-white/10 p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-auto"
          >
            <nav className="space-y-2 mt-8">
              <Link to="/" className="flex items-center space-x-3 p-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  🏠
                </div>
                <span>Home</span>
              </Link>
              <Link to="/music" className="flex items-center space-x-3 p-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  🎵
                </div>
                <span>Music</span>
              </Link>
              <Link to="/games" className="flex items-center space-x-3 p-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  🎮
                </div>
                <span>Games</span>
              </Link>
              <Link to="/commands" className="flex items-center space-x-3 p-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  🤖
                </div>
                <span>Bot Commands</span>
              </Link>
              <Link to="/economy" className="flex items-center space-x-3 p-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  💰
                </div>
                <span>Economy</span>
              </Link>
              <Link to="/achievements" className="flex items-center space-x-3 p-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  🏆
                </div>
                <span>Achievements</span>
              </Link>
              <Link to="/settings" className="flex items-center space-x-3 p-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all">
                <div className="w-8 h-8 rounded-lg bg-gray-500/20 flex items-center justify-center">
                  ⚙️
                </div>
                <span>Settings</span>
              </Link>
            </nav>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route 
              path="/" 
              element={
                <motion.div
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <HomeNew />
                </motion.div>
              } 
            />
            <Route 
              path="/music" 
              element={
                <motion.div
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <MusicAdvanced />
                </motion.div>
              } 
            />
            <Route 
              path="/games" 
              element={
                <motion.div
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <GameHub />
                </motion.div>
              } 
            />
            <Route 
              path="/commands" 
              element={
                <motion.div
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <BotCommands />
                </motion.div>
              } 
            />
            <Route 
              path="/economy" 
              element={
                <motion.div
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <Economy />
                </motion.div>
              } 
            />
            <Route 
              path="/achievements" 
              element={
                <motion.div
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <Achievements />
                </motion.div>
              } 
            />
            <Route 
              path="/ai" 
              element={
                <motion.div
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <AIChat />
                </motion.div>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <motion.div
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <Settings />
                </motion.div>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <motion.div
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <Admin />
                </motion.div>
              } 
            />
            <Route 
              path="*" 
              element={
                <motion.div
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <NotFound />
                </motion.div>
              } 
            />
          </Routes>
        </AnimatePresence>
      </div>

      <DebugOverlay />
    </div>
  );
}
