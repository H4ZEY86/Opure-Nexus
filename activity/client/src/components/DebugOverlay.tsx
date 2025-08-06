import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useDiscord } from '../hooks/useDiscord'

export default function DebugOverlay() {
  const [isVisible, setIsVisible] = useState(false)
  const [authLogs, setAuthLogs] = useState<string[]>([])
  const { user, discordSdk, ready, isLoading, error } = useDiscord()
  
  // Capture console logs for debugging
  React.useEffect(() => {
    const originalConsoleLog = console.log
    const originalConsoleWarn = console.warn
    const originalConsoleError = console.error
    
    const logCapture = (level: string, ...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')
      
      if (message.includes('🔄') || message.includes('✅') || message.includes('⚠️') || 
          message.includes('Discord') || message.includes('Auth') || message.includes('OAuth')) {
        setAuthLogs(prev => [...prev.slice(-10), `[${level}] ${message}`])
      }
    }
    
    console.log = (...args) => {
      logCapture('LOG', ...args)
      originalConsoleLog(...args)
    }
    
    console.warn = (...args) => {
      logCapture('WARN', ...args)  
      originalConsoleWarn(...args)
    }
    
    console.error = (...args) => {
      logCapture('ERROR', ...args)
      originalConsoleError(...args)
    }
    
    return () => {
      console.log = originalConsoleLog
      console.warn = originalConsoleWarn
      console.error = originalConsoleError
    }
  }, [])

  return (
    <>
      {/* Debug Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed top-4 right-4 z-50 bg-red-600 text-white px-3 py-1 rounded text-xs font-mono opacity-70 hover:opacity-100"
      >
        DEBUG
      </button>

      {/* Debug Overlay */}
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-16 right-4 z-50 bg-black/90 text-white p-4 rounded-lg max-w-sm text-xs font-mono border border-red-500"
        >
          <h3 className="text-red-400 font-bold mb-2">🔍 DEBUG INFO</h3>
          
          <div className="space-y-1">
            <div><span className="text-yellow-400">isLoading:</span> {isLoading ? '✅' : '❌'}</div>
            <div><span className="text-yellow-400">ready:</span> {ready ? '✅' : '❌'}</div>
            <div><span className="text-yellow-400">discordSdk:</span> {discordSdk ? '✅' : '❌'}</div>
            <div><span className="text-yellow-400">user:</span> {user ? '✅' : '❌'}</div>
            
            {user && (
              <div className="border-t border-gray-600 pt-2 mt-2">
                <div className="text-green-400 font-bold">USER DATA:</div>
                <div>ID: {user.id}</div>
                <div>Name: {user.username}</div>
                <div>Global: {user.global_name || 'N/A'}</div>
                <div>Avatar: {user.avatar ? '✅' : '❌'}</div>
              </div>
            )}
            
            {error && (
              <div className="border-t border-red-600 pt-2 mt-2">
                <div className="text-red-400 font-bold">ERROR:</div>
                <div className="text-red-300 text-wrap break-words">{error}</div>
              </div>
            )}
            
            <div className="border-t border-gray-600 pt-2 mt-2">
              <div className="text-blue-400 font-bold">ENVIRONMENT:</div>
              <div>Domain: {window.location.hostname}</div>
              <div>Frame: {window.self !== window.top ? '✅' : '❌'}</div>
              <div>Referrer: {document.referrer.includes('discord') ? '✅' : '❌'}</div>
              <div>URL Params: {window.location.search ? '✅' : '❌'}</div>
              <div className="text-xs text-gray-400 mt-1">
                URL: {window.location.href.substring(0, 80)}...
              </div>
              <div className="text-xs text-gray-400">
                Params: {window.location.search || 'none'}
              </div>
            </div>
            
            {authLogs.length > 0 && (
              <div className="border-t border-purple-600 pt-2 mt-2">
                <div className="text-purple-400 font-bold">AUTH LOGS:</div>
                <div className="max-h-32 overflow-y-auto text-xs">
                  {authLogs.map((log, i) => (
                    <div key={i} className="text-purple-300 break-all">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-3 space-y-1">
            <button
              onClick={async () => {
                if (discordSdk) {
                  try {
                    console.log('🧪 Manual test: Trying discordSdk.commands.getUser()')
                    const user = await discordSdk.commands.getUser()
                    console.log('🧪 Manual getUser result:', user)
                  } catch (e) {
                    console.error('🧪 Manual getUser failed:', e)
                  }
                }
              }}
              className="bg-blue-600 text-white px-2 py-1 rounded text-xs w-full"
            >
              TEST GET USER
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="bg-gray-700 text-white px-2 py-1 rounded text-xs w-full"
            >
              CLOSE
            </button>
          </div>
        </motion.div>
      )}
    </>
  )
}