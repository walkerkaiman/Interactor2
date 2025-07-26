/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark theme colors
        'bg-primary': '#0f0f23',
        'bg-secondary': '#1a1a2e',
        'bg-tertiary': '#16213e',
        'text-primary': '#ffffff',
        'text-secondary': '#a0a0a0',
        'text-muted': '#6b7280',
        
        // Module type colors
        'input-module': '#3b82f6', // blue
        'output-module': '#10b981', // green
        'transform-module': '#f59e0b', // amber
        
        // Connection colors
        'connection-trigger': '#10b981', // green for triggers
        'connection-stream': '#3b82f6', // blue for streaming
        
        // Status colors
        'status-active': '#10b981',
        'status-inactive': '#6b7280',
        'status-error': '#ef4444',
        'status-warning': '#f59e0b',
        
        // UI colors
        'border': '#374151',
        'border-light': '#4b5563',
        'accent': '#6366f1',
        'accent-hover': '#4f46e5',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor' },
          '100%': { boxShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
        },
      },
    },
  },
  plugins: [],
} 