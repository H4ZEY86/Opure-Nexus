import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Opure.exe Dashboard',
  description: '3D Interactive Web Dashboard for Opure.exe Discord Bot',
  keywords: ['Discord Bot', 'Dashboard', '3D', 'Gaming', 'AI', 'Music'],
  authors: [{ name: 'Opure.exe Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body 
        className={cn(
          'min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 antialiased overflow-hidden',
          inter.variable,
          jetbrainsMono.variable,
          'font-display'
        )}
      >
        {/* Animated background grid */}
        <div className="fixed inset-0 bg-cyber-grid bg-cyber-grid opacity-20 animate-pulse-glow" />
        
        {/* Main content */}
        <main className="relative z-10">
          {children}
        </main>
      </body>
    </html>
  )
}