/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Opure.exe brand colors
        primary: {
          50: '#f0f4ff',
          500: '#5865f2',
          600: '#4752c4',
          700: '#3c45a3',
          900: '#1e1f48',
        },
        discord: {
          blurple: '#5865f2',
          green: '#57f287',
          yellow: '#fee75c',
          red: '#ed4245',
          dark: '#2c2f33',
          darker: '#23272a',
        },
        cyber: {
          neon: '#00ffff',
          purple: '#9d4edd',
          pink: '#ff006e',
          green: '#39ff14',
          orange: '#ff6b35',
          blue: '#0066ff',
        },
        rangers: {
          blue: '#0066cc',
          light: '#4d9fff',
          dark: '#003d80',
          red: '#ff0000',
          white: '#ffffff',
        },
        scottish: {
          blue: '#005eb8',
          white: '#ffffff',
          saltire: '#0065bd',
        },
        gpu: {
          green: '#76b900',
          bright: '#9acd32',
          dark: '#5a8a00',
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
        'display': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'rotate-slow': 'rotate 20s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'bounce-slow': 'bounce 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'pulse-fast': 'pulse 1s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor',
          },
          '50%': {
            boxShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { textShadow: '0 0 5px currentColor' },
          '100%': { textShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
        },
      },
      backgroundImage: {
        'cyber-grid': 'linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)',
      },
      backgroundSize: {
        'cyber-grid': '20px 20px',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}