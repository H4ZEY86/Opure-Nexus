import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { DiscordProxy } from '@robojs/patch'
import App from './App.tsx'
import { DiscordProvider } from './contexts/DiscordContext.tsx'
import { AudioProvider } from './contexts/AudioContext.tsx'
import './index.css'

// Apply Discord Activity network patch BEFORE everything else
DiscordProxy.patch()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <DiscordProvider>
          <AudioProvider>
            <App />
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'rgba(17, 24, 39, 0.95)',
                  color: '#ffffff',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                },
              }}
            />
          </AudioProvider>
        </DiscordProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)