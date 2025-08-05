import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Copy } from 'lucide-react'

interface DiscordEnvironment {
  inIframe: boolean
  discordReferrer: boolean
  hasDiscordQuery: boolean
  userAgent: string
  referrer: string
  url: string
  isLikelyInDiscord: boolean
  windowLocation: any
  discordSdkAvailable: boolean
}

export function DiscordAuthDebugger() {
  const [env, setEnv] = useState<DiscordEnvironment | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const checkEnvironment = () => {
      const inIframe = window.self !== window.top
      const discordReferrer = document.referrer.includes('discord.com')
      const hasDiscordQuery = window.location.search.includes('frame_id') || 
                             window.location.search.includes('instance_id')
      
      const environment: DiscordEnvironment = {
        inIframe,
        discordReferrer, 
        hasDiscordQuery,
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        url: window.location.href,
        isLikelyInDiscord: inIframe || discordReferrer || hasDiscordQuery,
        windowLocation: {
          href: window.location.href,
          origin: window.location.origin,
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash
        },
        discordSdkAvailable: !!(window as any).DiscordSDK
      }
      
      setEnv(environment)
    }

    checkEnvironment()
  }, [])

  const copyToClipboard = () => {
    if (env) {
      const debugInfo = JSON.stringify(env, null, 2)
      navigator.clipboard.writeText(debugInfo)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!env) return null

  const StatusIcon = ({ condition }: { condition: boolean }) => 
    condition ? <CheckCircle className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-red-400" />

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 max-w-2xl mx-auto mt-8"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center">
          <AlertCircle className="w-6 h-6 text-yellow-400 mr-2" />
          Discord Environment Debug
        </h3>
        <button
          onClick={copyToClipboard}
          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          <Copy className="w-4 h-4" />
          <span>{copied ? 'Copied!' : 'Copy Debug Info'}</span>
        </button>
      </div>

      <div className="space-y-4">
        {/* Main Discord Detection */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">Discord Activity Context</span>
            <StatusIcon condition={env.isLikelyInDiscord} />
          </div>
          <div className="text-sm text-gray-300">
            {env.isLikelyInDiscord 
              ? '✅ Detected as Discord Activity environment'
              : '❌ NOT detected as Discord Activity - OAuth2 won\'t work!'
            }
          </div>
        </div>

        {/* Individual Checks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-300">In iFrame</span>
              <StatusIcon condition={env.inIframe} />
            </div>
            <div className="text-xs text-gray-400">
              {env.inIframe ? 'Running in iframe' : 'Not in iframe'}
            </div>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-300">Discord Referrer</span>
              <StatusIcon condition={env.discordReferrer} />
            </div>
            <div className="text-xs text-gray-400">
              {env.discordReferrer ? 'From discord.com' : 'Not from Discord'}
            </div>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-300">Discord Query Params</span>
              <StatusIcon condition={env.hasDiscordQuery} />
            </div>
            <div className="text-xs text-gray-400">
              {env.hasDiscordQuery ? 'Has Discord params' : 'No Discord params'}
            </div>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-300">Discord SDK</span>
              <StatusIcon condition={env.discordSdkAvailable} />
            </div>
            <div className="text-xs text-gray-400">
              {env.discordSdkAvailable ? 'SDK loaded' : 'SDK not loaded'}
            </div>
          </div>
        </div>

        {/* Detailed Info */}
        <div className="bg-gray-800/30 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3">Environment Details</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">URL:</span>
              <div className="text-gray-300 font-mono text-xs break-all">{env.url}</div>
            </div>
            <div>
              <span className="text-gray-400">Referrer:</span>
              <div className="text-gray-300 font-mono text-xs break-all">{env.referrer || 'None'}</div>
            </div>
            <div>
              <span className="text-gray-400">Search Params:</span>
              <div className="text-gray-300 font-mono text-xs">{env.windowLocation.search || 'None'}</div>
            </div>
          </div>
        </div>

        {/* Troubleshooting Guide */}
        {!env.isLikelyInDiscord && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
            <h4 className="text-red-400 font-medium mb-2">🚨 Not in Discord Activity Context</h4>
            <div className="text-sm text-red-200 space-y-1">
              <p>• Don't visit https://opure.uk directly in browser</p>
              <p>• Use Discord Developer Portal → Activities → "Test Activity"</p>
              <p>• Or launch Activity from Discord voice channel</p>
              <p>• Check Activity URL Mappings in Developer Portal</p>
            </div>
          </div>
        )}

        {env.isLikelyInDiscord && (
          <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4">
            <h4 className="text-green-400 font-medium mb-2">✅ Discord Environment Detected</h4>
            <div className="text-sm text-green-200">
              OAuth2 authentication should work. If it's still not showing, check:
              <ul className="mt-2 space-y-1 ml-4 list-disc">
                <li>Discord Developer Portal OAuth2 redirect URIs</li>
                <li>Activity scopes (identify, rpc.activities.write)</li>
                <li>Console for authentication errors</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}