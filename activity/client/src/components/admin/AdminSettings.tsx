import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Key, Shield, Bell, RefreshCw } from 'lucide-react'

interface AdminSettingsProps {
  user: any
  permissions: string[]
  realTimeData: any
  onNotification: (notification: any) => void
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ onNotification }) => {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
        <span className="ml-3 text-white font-medium">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="text-center py-12">
      <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-2xl font-bold text-white mb-2">Admin Settings</h3>
      <p className="text-white/60 mb-6">System configuration and administrative preferences</p>
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20 max-w-2xl mx-auto">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <Key className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-white font-medium">API Keys</p>
            <p className="text-white/80 text-sm">5 Active</p>
          </div>
          <div className="text-center">
            <Shield className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-white font-medium">Security</p>
            <p className="text-green-400 text-sm">Enhanced</p>
          </div>
          <div className="text-center">
            <Bell className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-white font-medium">Notifications</p>
            <p className="text-white/80 text-sm">Enabled</p>
          </div>
        </div>
        <p className="text-white/60 text-sm">
          Administrative settings panel with system configuration, security policies, 
          notification preferences, and integration management coming soon.
        </p>
      </div>
    </div>
  )
}

export default AdminSettings