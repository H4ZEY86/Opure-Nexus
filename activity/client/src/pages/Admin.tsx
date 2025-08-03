import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAdmin, AdminProvider } from '../contexts/AdminContext'
import AdminLogin from '../components/admin/AdminLogin'
import AdminDashboard from '../components/admin/AdminDashboard'
import { AlertTriangle, Shield, Loader } from 'lucide-react'

const AdminPage: React.FC = () => {
  return (
    <AdminProvider>
      <AdminPageContent />
    </AdminProvider>
  )
}

const AdminPageContent: React.FC = () => {
  const { user, isAuthenticated, isLoading, checkSession } = useAdmin()
  const [sessionValid, setSessionValid] = useState<boolean | null>(null)

  useEffect(() => {
    const validateSession = async () => {
      if (isAuthenticated && user) {
        const valid = await checkSession()
        setSessionValid(valid)
        
        if (!valid) {
          // Session expired, will trigger logout
          console.log('Session expired, redirecting to login')
        }
      }
    }

    validateSession()
  }, [isAuthenticated, user, checkSession])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20 text-center"
        >
          <Loader className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Initializing Admin System</h2>
          <p className="text-white/60">Verifying credentials and loading dashboard...</p>
        </motion.div>
      </div>
    )
  }

  // Error state for invalid session
  if (isAuthenticated && sessionValid === false) {
    return <SessionExpiredError />
  }

  // Authentication check
  if (!isAuthenticated || !user) {
    return <AdminLogin onLoginSuccess={() => window.location.reload()} />
  }

  // Admin access verification
  if (!user.isAdmin) {
    return <AccessDeniedError />
  }

  // Main admin dashboard
  return (
    <AdminDashboard 
      user={user} 
      permissions={user.permissions} 
    />
  )
}

const SessionExpiredError: React.FC = () => {
  const { logout } = useAdmin()

  useEffect(() => {
    // Auto-logout after showing the message
    const timer = setTimeout(() => {
      logout()
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [logout])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20 text-center max-w-md"
      >
        <AlertTriangle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Session Expired</h2>
        <p className="text-white/60 mb-6">
          Your admin session has expired for security reasons. You will be redirected to the login page.
        </p>
        <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
          <Loader className="w-4 h-4 animate-spin" />
          Redirecting in 3 seconds...
        </div>
      </motion.div>
    </div>
  )
}

const AccessDeniedError: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20 text-center max-w-md"
      >
        <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-white/60 mb-6">
          You do not have administrative privileges to access this section. 
          Please contact a system administrator if you believe this is an error.
        </p>
        <div className="space-y-2 text-sm text-white/40">
          <p>• Administrative access is required</p>
          <p>• All access attempts are logged</p>
          <p>• Contact your system administrator for access</p>
        </div>
        <button
          onClick={() => window.history.back()}
          className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-colors"
        >
          Go Back
        </button>
      </motion.div>
    </div>
  )
}

export default AdminPage