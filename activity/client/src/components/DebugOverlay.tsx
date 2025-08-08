import React from 'react'

export default function DebugOverlay() {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded font-mono">
      🎮 3D Gaming Hub - Debug Mode
    </div>
  )
}