import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Loader,
  Smartphone,
  Key,
  ArrowRight,
  ArrowLeft,
  Fingerprint,
  Clock,
  Globe,
  RefreshCw
} from 'lucide-react'
import { useAdmin } from '../../contexts/AdminContext'

interface AdminLoginProps {
  onLoginSuccess: () => void
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const { login, isLoading } = useAdmin()
  const [step, setStep] = useState<'credentials' | 'mfa' | 'success'>('credentials')
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    mfaCode: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutTime, setLockoutTime] = useState(0)
  const [biometricAvailable, setBiometricAvailable] = useState(false)

  // Check for biometric authentication availability
  useEffect(() => {
    if ('webauthn' in window && 'credentials' in navigator) {
      setBiometricAvailable(true)
    }
  }, [])

  // Handle lockout timer
  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setInterval(() => {
        setLockoutTime(prev => {
          if (prev <= 1) {
            setIsLocked(false)
            setLoginAttempts(0)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [lockoutTime])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLocked) {
      setError(`Account locked. Try again in ${lockoutTime} seconds.`)
      return
    }

    setError('')
    setSuccess('')

    if (step === 'credentials') {
      if (!credentials.username.trim() || !credentials.password.trim()) {
        setError('Please enter both username and password')
        return
      }

      try {
        const result = await login({
          username: credentials.username,
          password: credentials.password
        })

        if (result.success) {
          setStep('success')
          setSuccess('Login successful! Redirecting to admin dashboard...')
          setTimeout(() => {
            onLoginSuccess()
          }, 2000)
        } else {
          // Handle failed login attempt
          const newAttempts = loginAttempts + 1
          setLoginAttempts(newAttempts)
          
          if (newAttempts >= 5) {
            setIsLocked(true)
            setLockoutTime(300) // 5 minutes lockout
            setError('Too many failed attempts. Account locked for 5 minutes.')
          } else if (result.error?.includes('MFA')) {
            setStep('mfa')
            setError('')
          } else {
            setError(result.error || 'Invalid credentials')
          }
        }
      } catch (error) {
        setError('Network error. Please try again.')
      }
    } else if (step === 'mfa') {
      if (!credentials.mfaCode.trim()) {
        setError('Please enter your MFA code')
        return
      }

      try {
        const result = await login({
          username: credentials.username,
          password: credentials.password,
          mfaCode: credentials.mfaCode
        })

        if (result.success) {
          setStep('success')
          setSuccess('MFA verified! Redirecting to admin dashboard...')
          setTimeout(() => {
            onLoginSuccess()
          }, 2000)
        } else {
          setError(result.error || 'Invalid MFA code')
        }
      } catch (error) {
        setError('Network error. Please try again.')
      }
    }
  }

  const handleBiometricLogin = async () => {
    try {
      setError('')
      // This would implement WebAuthn biometric authentication
      // For now, we'll show a placeholder
      setError('Biometric authentication not yet configured')
    } catch (error) {
      setError('Biometric authentication failed')
    }
  }

  const formatLockoutTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getSecurityLevel = (): { level: string; color: string; description: string } => {
    if (step === 'success') {
      return { level: 'Maximum', color: 'text-green-400', description: 'Authenticated with full privileges' }
    } else if (step === 'mfa') {
      return { level: 'High', color: 'text-yellow-400', description: 'Multi-factor authentication required' }
    } else {
      return { level: 'Standard', color: 'text-blue-400', description: 'Initial authentication required' }
    }
  }

  const securityInfo = getSecurityLevel()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%227%22%20cy%3D%227%22%20r%3D%227%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
      
      {/* Floating Security Badges */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear'
          }}
          className="absolute top-1/4 left-1/4 w-32 h-32 bg-red-500/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -150, 0],
            y: [0, 150, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'linear'
          }}
          className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Security Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-red-500 to-purple-500 rounded-2xl mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Access</h1>
          <p className="text-white/60">Secure administrative portal</p>
          
          {/* Security Level Indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <Lock className="w-4 h-4 text-white/60" />
            <span className={`text-sm font-medium ${securityInfo.color}`}>
              {securityInfo.level} Security
            </span>
          </div>
          <p className="text-white/40 text-xs mt-1">{securityInfo.description}</p>
        </motion.div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20 shadow-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {step === 'credentials' && (
                <motion.div
                  key="credentials"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  {/* Username Field */}
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Administrator Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type="text"
                        value={credentials.username}
                        onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                        placeholder="Enter admin username"
                        disabled={isLoading || isLocked}
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={credentials.password}
                        onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full pl-12 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                        placeholder="Enter admin password"
                        disabled={isLoading || isLocked}
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60"
                        disabled={isLoading || isLocked}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {credentials.password.length > 0 && (
                      <div className="mt-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full ${
                                credentials.password.length >= level * 3
                                  ? level <= 2 ? 'bg-red-400' : level === 3 ? 'bg-yellow-400' : 'bg-green-400'
                                  : 'bg-white/20'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-white/60 text-xs mt-1">
                          {credentials.password.length < 8 ? 'Weak' : 
                           credentials.password.length < 12 ? 'Good' : 'Strong'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-white/80 text-sm">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-400"
                        disabled={isLoading || isLocked}
                      />
                      Remember this device
                    </label>
                    
                    {loginAttempts > 0 && (
                      <span className="text-orange-400 text-xs">
                        {5 - loginAttempts} attempts remaining
                      </span>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 'mfa' && (
                <motion.div
                  key="mfa"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-6">
                    <Smartphone className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-white mb-2">Two-Factor Authentication</h3>
                    <p className="text-white/60 text-sm">
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Authentication Code
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type="text"
                        value={credentials.mfaCode}
                        onChange={(e) => setCredentials(prev => ({ ...prev, mfaCode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                        className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                        placeholder="000000"
                        disabled={isLoading}
                        maxLength={6}
                        autoComplete="one-time-code"
                        required
                      />
                    </div>
                    <p className="text-white/40 text-xs mt-2 text-center">
                      Code expires in 30 seconds
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep('credentials')}
                    className="flex items-center gap-2 text-white/60 hover:text-white text-sm"
                    disabled={isLoading}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </button>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Authentication Successful</h3>
                  <p className="text-green-400 mb-4">Welcome back, Administrator</p>
                  <div className="flex items-center justify-center gap-2 text-white/60 text-sm">
                    <Loader className="w-4 h-4 animate-spin" />
                    Redirecting to admin dashboard...
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm"
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm"
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lockout Message */}
            <AnimatePresence>
              {isLocked && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400 text-sm"
                >
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  Account locked for {formatLockoutTime(lockoutTime)}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            {step !== 'success' && (
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isLoading || isLocked}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : step === 'credentials' ? (
                    <>
                      Sign In
                      <ArrowRight className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      Verify Code
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Biometric Login */}
                {biometricAvailable && step === 'credentials' && (
                  <button
                    type="button"
                    onClick={handleBiometricLogin}
                    disabled={isLoading || isLocked}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Fingerprint className="w-5 h-5" />
                    Use Biometric Authentication
                  </button>
                )}
              </div>
            )}
          </form>
        </motion.div>

        {/* Security Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8 space-y-4"
        >
          <div className="flex items-center justify-center gap-4 text-white/40 text-sm">
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span>256-bit SSL</span>
            </div>
            <div className="flex items-center gap-1">
              <Globe className="w-4 h-4" />
              <span>Secure Connection</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Session Timeout: 1h</span>
            </div>
          </div>
          
          <p className="text-white/30 text-xs">
            Unauthorized access is strictly prohibited and monitored.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default AdminLogin