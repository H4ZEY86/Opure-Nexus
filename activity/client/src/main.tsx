import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import App from './App'
import { DiscordProvider } from './contexts/DiscordContextDirect'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <DiscordProvider>
        <App />
      </DiscordProvider>
    </Router>
  </React.StrictMode>,
)
