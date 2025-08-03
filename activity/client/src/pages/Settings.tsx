import React from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, User, Volume, Palette } from 'lucide-react'

export default function Settings() {
  const settingsGroups = [
    {
      icon: User,
      title: 'Profile',
      description: 'Manage your profile and preferences',
      items: ['Display Name', 'Avatar', 'Status'],
    },
    {
      icon: Volume,
      title: 'Audio',
      description: 'Configure audio and music settings',
      items: ['Volume', 'Quality', 'Crossfade'],
    },
    {
      icon: Palette,
      title: 'Appearance',
      description: 'Customize the look and feel',
      items: ['Theme', 'Animations', 'Layout'],
    },
  ]

  return (
    <div className="flex-1 flex flex-col p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center space-x-3 mb-2">
          <SettingsIcon className="w-8 h-8 text-blue-400" />
          <h1 className="text-3xl font-bold text-white">Settings</h1>
        </div>
        <p className="text-gray-300">Customize your Opure experience</p>
      </motion.div>

      {/* Settings Groups */}
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {settingsGroups.map((group, index) => (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-6"
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <group.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">{group.title}</h3>
                <p className="text-gray-400 mb-4">{group.description}</p>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <div key={item} className="flex items-center justify-between py-2">
                      <span className="text-gray-300">{item}</span>
                      <div className="text-gray-500 text-sm">Coming soon</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Coming Soon */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center mt-8"
      >
        <p className="text-gray-400">🚧 Settings panel coming soon!</p>
      </motion.div>
    </div>
  )
}