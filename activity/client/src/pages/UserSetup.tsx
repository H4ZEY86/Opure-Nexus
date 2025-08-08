import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sphere, MeshDistortMaterial, Float } from '@react-three/drei'
import { 
  Palette,
  Monitor,
  Smartphone,
  Volume2,
  Eye,
  Gamepad2,
  Music,
  Sparkles,
  Check,
  ChevronRight,
  User,
  Settings
} from 'lucide-react'
import { useDiscord } from '../contexts/DiscordContextDirect'

// 3D Background Orb
function SetupOrb({ color }: { color: string }) {
  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere args={[0.8, 100, 200]} scale={1.5}>
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={0.2}
          speed={1}
          roughness={0.2}
        />
      </Sphere>
    </Float>
  )
}

interface Theme {
  id: string
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
  }
  preview: string
}

const themes: Theme[] = [
  {
    id: 'cosmic',
    name: 'Cosmic Purple',
    colors: {
      primary: '#8b5cf6',
      secondary: '#a78bfa', 
      accent: '#c084fc',
      background: 'from-slate-900 via-purple-900 to-slate-900'
    },
    preview: 'bg-gradient-to-br from-purple-500 to-pink-600'
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    colors: {
      primary: '#0ea5e9',
      secondary: '#38bdf8',
      accent: '#7dd3fc', 
      background: 'from-slate-900 via-blue-900 to-slate-900'
    },
    preview: 'bg-gradient-to-br from-blue-500 to-cyan-600'
  },
  {
    id: 'forest',
    name: 'Forest Green',
    colors: {
      primary: '#10b981',
      secondary: '#34d399',
      accent: '#6ee7b7',
      background: 'from-slate-900 via-green-900 to-slate-900'
    },
    preview: 'bg-gradient-to-br from-green-500 to-emerald-600'
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    colors: {
      primary: '#f59e0b',
      secondary: '#fbbf24',
      accent: '#fcd34d',
      background: 'from-slate-900 via-orange-900 to-slate-900'
    },
    preview: 'bg-gradient-to-br from-orange-500 to-yellow-600'
  },
  {
    id: 'neon',
    name: 'Neon Pink',
    colors: {
      primary: '#ec4899',
      secondary: '#f472b6',
      accent: '#f9a8d4',
      background: 'from-slate-900 via-pink-900 to-slate-900'
    },
    preview: 'bg-gradient-to-br from-pink-500 to-rose-600'
  },
  {
    id: 'dark',
    name: 'Pure Dark',
    colors: {
      primary: '#6b7280',
      secondary: '#9ca3af',
      accent: '#d1d5db',
      background: 'from-gray-900 via-slate-900 to-black'
    },
    preview: 'bg-gradient-to-br from-gray-500 to-slate-600'
  }
]

export default function UserSetup() {
  const { user } = useDiscord()
  const [step, setStep] = useState(1)
  const [selectedTheme, setSelectedTheme] = useState(themes[0])
  const [settings, setSettings] = useState({
    animations: true,
    reducedMotion: false,
    highContrast: false,
    fontSize: 'medium',
    volume: 75,
    autoPlay: true,
    notifications: true
  })
  const [isComplete, setIsComplete] = useState(false)

  const totalSteps = 4

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      completeSetup()
    }
  }

  const completeSetup = () => {
    // Save user preferences
    const userPrefs = {
      theme: selectedTheme,
      settings,
      setupComplete: true,
      setupDate: new Date().toISOString()
    }
    
    localStorage.setItem(`opure_user_preferences_${user?.id}`, JSON.stringify(userPrefs))
    localStorage.setItem('opure_theme', selectedTheme.id)
    
    setIsComplete(true)
    
    // Redirect to main app after setup
    setTimeout(() => {
      window.location.hash = '/home'
    }, 2000)
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Check className="w-12 h-12 text-white" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl font-bold text-white mb-4"
          >
            Welcome to Opure!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-white/70 text-lg"
          >
            Your personalized experience is ready
          </motion.p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${selectedTheme.colors.background} relative overflow-hidden`}>
      {/* 3D Background */}
      <div className="absolute inset-0 opacity-20">
        <Canvas>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <SetupOrb color={selectedTheme.colors.primary} />
          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.3} />
        </Canvas>
      </div>

      {/* Progress Bar */}
      <div className="relative z-10 pt-8 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all
                  ${stepNum <= step 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white' 
                    : 'bg-white/10 text-white/50'
                  }
                `}>
                  {stepNum < step ? <Check className="w-5 h-5" /> : stepNum}
                </div>
                {stepNum < 4 && (
                  <div className={`w-16 h-1 mx-4 rounded transition-all ${
                    stepNum < step ? 'bg-gradient-to-r from-purple-500 to-pink-600' : 'bg-white/20'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="relative z-10 px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {/* Step 1: Welcome & User Info */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="text-center"
              >
                <h1 className="text-5xl font-bold text-white mb-6">
                  Welcome to Opure!
                </h1>
                <p className="text-white/70 text-xl mb-8">
                  Let's set up your personalized Discord Activity experience
                </p>

                {user && (
                  <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-8 mb-8 max-w-md mx-auto">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-purple-400/30">
                        {user.avatar ? (
                          <img
                            src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=256`}
                            alt={user.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-600 flex items-center justify-center text-2xl font-bold text-white">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <h3 className="text-2xl font-semibold text-white">
                          {user.global_name || user.username}
                        </h3>
                        <p className="text-white/60">#{user.discriminator}</p>
                      </div>
                    </div>
                    <div className="text-green-400 text-sm flex items-center justify-center space-x-2">
                      <Check className="w-4 h-4" />
                      <span>Discord Authentication Successful</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Theme Selection */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <h2 className="text-4xl font-bold text-white text-center mb-6">
                  Choose Your Theme
                </h2>
                <p className="text-white/70 text-lg text-center mb-8">
                  Select a color theme that matches your style
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {themes.map((theme) => (
                    <motion.div
                      key={theme.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedTheme(theme)}
                      className={`
                        ${theme.preview} p-6 rounded-2xl cursor-pointer relative
                        ${selectedTheme.id === theme.id ? 'ring-4 ring-white/50' : ''}
                      `}
                    >
                      {selectedTheme.id === theme.id && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-purple-600" />
                        </div>
                      )}
                      <div className="text-white font-semibold text-center">
                        {theme.name}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Accessibility & Settings */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <h2 className="text-4xl font-bold text-white text-center mb-6">
                  Accessibility & Preferences
                </h2>
                <p className="text-white/70 text-lg text-center mb-8">
                  Customize your experience for comfort and accessibility
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  {/* Animation Settings */}
                  <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                      <Sparkles className="w-6 h-6" />
                      <span>Animations</span>
                    </h3>
                    <div className="space-y-4">
                      <label className="flex items-center justify-between">
                        <span className="text-white/80">Enable animations</span>
                        <input
                          type="checkbox"
                          checked={settings.animations}
                          onChange={(e) => setSettings({...settings, animations: e.target.checked})}
                          className="w-5 h-5 rounded"
                        />
                      </label>
                      <label className="flex items-center justify-between">
                        <span className="text-white/80">Reduced motion</span>
                        <input
                          type="checkbox"
                          checked={settings.reducedMotion}
                          onChange={(e) => setSettings({...settings, reducedMotion: e.target.checked})}
                          className="w-5 h-5 rounded"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Visual Settings */}
                  <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                      <Eye className="w-6 h-6" />
                      <span>Visual</span>
                    </h3>
                    <div className="space-y-4">
                      <label className="flex items-center justify-between">
                        <span className="text-white/80">High contrast</span>
                        <input
                          type="checkbox"
                          checked={settings.highContrast}
                          onChange={(e) => setSettings({...settings, highContrast: e.target.checked})}
                          className="w-5 h-5 rounded"
                        />
                      </label>
                      <div>
                        <label className="block text-white/80 mb-2">Font size</label>
                        <select
                          value={settings.fontSize}
                          onChange={(e) => setSettings({...settings, fontSize: e.target.value})}
                          className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white"
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Audio Settings */}
                  <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                      <Volume2 className="w-6 h-6" />
                      <span>Audio</span>
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-white/80 mb-2">Volume: {settings.volume}%</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={settings.volume}
                          onChange={(e) => setSettings({...settings, volume: parseInt(e.target.value)})}
                          className="w-full"
                        />
                      </div>
                      <label className="flex items-center justify-between">
                        <span className="text-white/80">Auto-play music</span>
                        <input
                          type="checkbox"
                          checked={settings.autoPlay}
                          onChange={(e) => setSettings({...settings, autoPlay: e.target.checked})}
                          className="w-5 h-5 rounded"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Notification Settings */}
                  <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                      <Settings className="w-6 h-6" />
                      <span>Notifications</span>
                    </h3>
                    <div className="space-y-4">
                      <label className="flex items-center justify-between">
                        <span className="text-white/80">Enable notifications</span>
                        <input
                          type="checkbox"
                          checked={settings.notifications}
                          onChange={(e) => setSettings({...settings, notifications: e.target.checked})}
                          className="w-5 h-5 rounded"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Preview & Finish */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="text-center"
              >
                <h2 className="text-4xl font-bold text-white mb-6">
                  You're All Set!
                </h2>
                <p className="text-white/70 text-lg mb-8">
                  Here's a preview of your personalized Opure experience
                </p>

                {/* Preview */}
                <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-8 max-w-2xl mx-auto mb-8">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className={`${selectedTheme.preview} p-4 rounded-xl`}>
                      <Music className="w-8 h-8 text-white mx-auto mb-2" />
                      <div className="text-white font-medium">Music Hub</div>
                    </div>
                    <div className={`${selectedTheme.preview} p-4 rounded-xl`}>
                      <Gamepad2 className="w-8 h-8 text-white mx-auto mb-2" />
                      <div className="text-white font-medium">Games</div>
                    </div>
                  </div>
                  
                  <div className="text-white/80">
                    <div className="mb-2">Theme: <span className="text-white font-semibold">{selectedTheme.name}</span></div>
                    <div className="mb-2">Animations: <span className="text-white font-semibold">{settings.animations ? 'Enabled' : 'Disabled'}</span></div>
                    <div>Volume: <span className="text-white font-semibold">{settings.volume}%</span></div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-center space-x-4 mt-12">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-8 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-white font-medium transition-all"
              >
                Previous
              </button>
            )}
            <button
              onClick={nextStep}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 rounded-xl text-white font-medium transition-all flex items-center space-x-2"
            >
              <span>{step === totalSteps ? 'Complete Setup' : 'Next'}</span>
              {step < totalSteps && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}