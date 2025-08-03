import React, { createContext, useContext, useState, useEffect } from 'react'

interface AdminUser {
  userId: string
  username: string
  avatar?: string
  permissions: string[]
  isAdmin: boolean
  isSuperAdmin: boolean
  lastLogin?: string
  sessionExpires?: string
}

interface AdminContextType {
  user: AdminUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshSession: () => Promise<void>
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  checkSession: () => Promise<boolean>
}

interface LoginCredentials {
  username: string
  password: string
  mfaCode?: string
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession()
  }, [])

  // Set up session refresh timer
  useEffect(() => {
    if (user?.sessionExpires) {
      const expiresAt = new Date(user.sessionExpires).getTime()
      const now = Date.now()
      const timeUntilExpiry = expiresAt - now
      
      // Refresh session 5 minutes before expiry
      const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 60 * 1000)
      
      const timer = setTimeout(() => {
        refreshSession()
      }, refreshTime)

      return () => clearTimeout(timer)
    }
  }, [user?.sessionExpires])

  const checkExistingSession = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        setIsLoading(false)
        return
      }

      const valid = await checkSession()
      if (valid) {
        await loadUserProfile()
      } else {
        localStorage.removeItem('adminToken')
        setUser(null)
      }
    } catch (error) {
      console.error('Error checking existing session:', error)
      localStorage.removeItem('adminToken')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const checkSession = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) return false

      const response = await fetch('/api/admin/auth/validate', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      return response.ok
    } catch (error) {
      console.error('Error validating session:', error)
      return false
    }
  }

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) return

      const response = await fetch('/api/admin/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const userData = await response.json()
        setUser({
          userId: userData.userId,
          username: userData.username,
          avatar: userData.avatar,
          permissions: userData.permissions || [],
          isAdmin: userData.isAdmin || false,
          isSuperAdmin: userData.isSuperAdmin || false,
          lastLogin: userData.lastLogin,
          sessionExpires: userData.sessionExpires
        })
      } else {
        throw new Error('Failed to load user profile')
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
      throw error
    }
  }

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true)

      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      })

      const data = await response.json()

      if (response.ok) {
        // Store the admin token
        localStorage.setItem('adminToken', data.token)
        
        // Set user data
        setUser({
          userId: data.user.userId,
          username: data.user.username,
          avatar: data.user.avatar,
          permissions: data.user.permissions || [],
          isAdmin: data.user.isAdmin || false,
          isSuperAdmin: data.user.isSuperAdmin || false,
          lastLogin: data.user.lastLogin,
          sessionExpires: data.user.sessionExpires
        })

        // Log successful admin login
        await logAdminAction('login', {
          timestamp: new Date().toISOString(),
          ip: await getClientIP(),
          userAgent: navigator.userAgent
        })

        return { success: true }
      } else {
        // Handle specific error cases
        if (response.status === 423) {
          return { success: false, error: 'Account is locked. Please try again later.' }
        } else if (response.status === 401) {
          return { success: false, error: data.error || 'Invalid credentials' }
        } else if (response.status === 429) {
          return { success: false, error: 'Too many login attempts. Please try again later.' }
        } else {
          return { success: false, error: data.error || 'Login failed' }
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Network error. Please try again.' }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      
      if (token && user) {
        // Log admin logout
        await logAdminAction('logout', {
          timestamp: new Date().toISOString(),
          sessionDuration: user.lastLogin ? Date.now() - new Date(user.lastLogin).getTime() : 0
        })

        // Notify server of logout
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      }
    } catch (error) {
      console.error('Error during logout:', error)
    } finally {
      // Clear local state regardless of server response
      localStorage.removeItem('adminToken')
      setUser(null)
    }
  }

  const refreshSession = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) return

      const response = await fetch('/api/admin/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('adminToken', data.token)
        
        setUser(prev => prev ? {
          ...prev,
          sessionExpires: data.sessionExpires
        } : null)
      } else {
        // Session could not be refreshed, force logout
        await logout()
      }
    } catch (error) {
      console.error('Error refreshing session:', error)
      await logout()
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.isAdmin) return false
    if (user.isSuperAdmin) return true
    return user.permissions.includes(permission) || user.permissions.includes('admin.all')
  }

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user || !user.isAdmin) return false
    if (user.isSuperAdmin) return true
    return permissions.some(permission => hasPermission(permission))
  }

  const logAdminAction = async (action: string, data: any) => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) return

      await fetch('/api/admin/audit/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          data,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Error logging admin action:', error)
    }
  }

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('/api/admin/client-ip')
      const data = await response.json()
      return data.ip || 'unknown'
    } catch (error) {
      return 'unknown'
    }
  }

  const value: AdminContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshSession,
    hasPermission,
    hasAnyPermission,
    checkSession
  }

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  )
}

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}

// Permission constants for easy reference
export const ADMIN_PERMISSIONS = {
  OVERVIEW: 'admin.overview',
  USERS: 'admin.users',
  ECONOMY: 'admin.economy',
  GAMES: 'admin.games',
  AI: 'admin.ai',
  DISCORD: 'admin.discord',
  MODERATION: 'admin.moderation',
  ANALYTICS: 'admin.analytics',
  MONITORING: 'admin.monitoring',
  AUDIT: 'admin.audit',
  SETTINGS: 'admin.settings',
  ALL: 'admin.all'
} as const

// Hook for checking specific permissions
export const useAdminPermission = (permission: string): boolean => {
  const { hasPermission } = useAdmin()
  return hasPermission(permission)
}

// Hook for checking multiple permissions
export const useAdminPermissions = (permissions: string[]): boolean => {
  const { hasAnyPermission } = useAdmin()
  return hasAnyPermission(permissions)
}

// Component for conditional rendering based on permissions
interface PermissionGateProps {
  permission?: string
  permissions?: string[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  permissions,
  fallback = null,
  children
}) => {
  const { hasPermission, hasAnyPermission } = useAdmin()

  let hasAccess = false
  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (permissions) {
    hasAccess = hasAnyPermission(permissions)
  }

  return <>{hasAccess ? children : fallback}</>
}

export default AdminContext