import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useDiscord } from '../hooks/useDiscord'

export default function DebugOverlay() {
  const [isVisible, setIsVisible] = useState(false)
  const [authLogs, setAuthLogs] = useState<string[]>([])
  const [testResults, setTestResults] = useState<string[]>([])
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
            
            {testResults.length > 0 && (
              <div className="border-t border-yellow-600 pt-2 mt-2">
                <div className="text-yellow-400 font-bold">TEST RESULTS:</div>
                <div className="max-h-32 overflow-y-auto text-xs">
                  {testResults.map((result, i) => (
                    <div key={i} className="text-yellow-300 break-all mb-1">
                      {result}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
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
                if (!discordSdk) {
                  setTestResults(prev => [...prev.slice(-5), 'No Discord SDK available'])
                  return
                }
                
                setTestResults(prev => [...prev.slice(-5), 'Testing Discord SDK...'])
                
                // Test 1: Available commands
                try {
                  const commands = Object.keys(discordSdk.commands || {})
                  setTestResults(prev => [...prev.slice(-5), `Available commands: ${commands.join(', ')}`])
                } catch (e) {
                  setTestResults(prev => [...prev.slice(-5), `Commands error: ${e.message}`])
                }
                
                // Test 2: getUser
                try {
                  const user = await discordSdk.commands.getUser()
                  setTestResults(prev => [...prev.slice(-5), `getUser result: ${JSON.stringify(user)}`])
                } catch (e) {
                  setTestResults(prev => [...prev.slice(-5), `getUser failed: ${e.message}`])
                }
                
                // Test 2.5: getInstanceConnectedParticipants (CRITICAL TEST)
                try {
                  const participants = await discordSdk.commands.getInstanceConnectedParticipants()
                  setTestResults(prev => [...prev.slice(-5), `participants: ${JSON.stringify(participants)}`])
                  if (participants?.participants?.length > 0) {
                    const firstUser = participants.participants[0]
                    setTestResults(prev => [...prev.slice(-5), `first user: ${JSON.stringify(firstUser)}`])
                  }
                } catch (e) {
                  setTestResults(prev => [...prev.slice(-5), `participants failed: ${e.message}`])
                }
                
                // Test 3: authenticate
                try {
                  const authResult = await discordSdk.commands.authenticate({
                    scope: ['identify']
                  })
                  setTestResults(prev => [...prev.slice(-5), `Auth result: ${JSON.stringify(authResult)}`])
                } catch (e) {
                  setTestResults(prev => [...prev.slice(-5), `Auth failed: ${e.message}`])
                }
                
                // Test 4: Check SDK properties
                const sdkInfo = {
                  clientId: discordSdk.clientId,
                  user: discordSdk.user ? 'exists' : 'null',
                  instanceId: (discordSdk as any).instanceId || 'none'
                }
                setTestResults(prev => [...prev.slice(-5), `SDK info: ${JSON.stringify(sdkInfo)}`])
              }}
              className="bg-blue-600 text-white px-2 py-1 rounded text-xs w-full"
            >
              RUN TESTS
            </button>
            <button
              onClick={async () => {
                if (!discordSdk) {
                  setTestResults(prev => [...prev.slice(-5), 'No Discord SDK available'])
                  return
                }
                
                setTestResults(prev => [...prev.slice(-5), 'Testing DIRECT authentication...'])
                
                // Test direct authentication like the app does
                try {
                  console.log('🧪 DEBUG TEST: Direct authorize() call')
                  const authResult = await discordSdk.commands.authorize({
                    client_id: discordSdk.clientId,
                    response_type: 'code',
                    state: '',
                    scope: 'identify rpc.activities.write'
                  })
                  setTestResults(prev => [...prev.slice(-5), `Direct authorize SUCCESS: ${JSON.stringify(authResult)}`])
                  
                  // Try token exchange with the code
                  if (authResult.code) {
                    try {
                      setTestResults(prev => [...prev.slice(-5), 'Testing token exchange...'])
                      
                      // Try multiple endpoints and methods
                      const endpoints = [
                        'https://api.opure.uk/api/auth/discord',
                        'https://api.opure.uk/api/auth/activity-sync',
                        'https://api.opure.uk/auth/discord'
                      ]
                      
                      for (const endpoint of endpoints) {
                        try {
                          setTestResults(prev => [...prev.slice(-5), `Trying: ${endpoint}`])
                          const tokenResponse = await fetch(endpoint, {
                            method: 'POST',
                            headers: { 
                              'Content-Type': 'application/json',
                              'Accept': 'application/json',
                              'Origin': window.location.origin
                            },
                            mode: 'cors',
                            body: JSON.stringify({ code: authResult.code })
                          })
                          
                          const responseText = await tokenResponse.text()
                          setTestResults(prev => [...prev.slice(-5), `${endpoint} (${tokenResponse.status}): ${responseText.substring(0, 200)}`])
                          
                          if (tokenResponse.ok) {
                            const tokenData = JSON.parse(responseText)
                            setTestResults(prev => [...prev.slice(-5), `SUCCESS! Token data: ${JSON.stringify(tokenData).substring(0, 200)}`])
                            break // Success, stop trying other endpoints
                          }
                        } catch (fetchError) {
                          setTestResults(prev => [...prev.slice(-5), `${endpoint} failed: ${fetchError.message}`])
                        }
                      }
                      
                    } catch (e) {
                      setTestResults(prev => [...prev.slice(-5), `Token exchange failed: ${e.message}`])
                    }
                  }
                  
                  // Try participants after auth
                  try {
                    const participants = await discordSdk.commands.getInstanceConnectedParticipants()
                    setTestResults(prev => [...prev.slice(-5), `Post-auth participants: ${JSON.stringify(participants)}`])
                  } catch (e) {
                    setTestResults(prev => [...prev.slice(-5), `Post-auth participants failed: ${e.message}`])
                  }
                } catch (e) {
                  setTestResults(prev => [...prev.slice(-5), `Direct authorize FAILED: ${e.message}`])
                  console.error('🧪 DEBUG TEST: Authorize failed:', e)
                  
                  // Fallback: Try with array scope
                  try {
                    setTestResults(prev => [...prev.slice(-5), 'Trying authorize with array scope...'])
                    const authResult2 = await discordSdk.commands.authorize({
                      client_id: discordSdk.clientId,
                      response_type: 'code',
                      state: '',
                      scope: ['identify', 'rpc.activities.write']
                    })
                    setTestResults(prev => [...prev.slice(-5), `Array scope SUCCESS: ${JSON.stringify(authResult2)}`])
                  } catch (e2) {
                    setTestResults(prev => [...prev.slice(-5), `Array scope FAILED: ${e2.message}`])
                    console.error('🧪 DEBUG TEST: Array scope failed:', e2)
                  }
                }
              }}
              className="bg-green-600 text-white px-2 py-1 rounded text-xs w-full"
            >
              TEST AUTH
            </button>
            <button
              onClick={() => setTestResults([])}
              className="bg-orange-600 text-white px-2 py-1 rounded text-xs w-full"
            >
              CLEAR TESTS
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