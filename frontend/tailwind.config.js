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
        // Aurora Ember dark theme (legacy — keep until pages migrated)
        dark: {
          primary: '#0A0908',
          secondary: '#151210',
          tertiary: '#221F1B',
          border: '#3D3730',
        },
        text: {
          primary: '#F2EDE8',
          secondary: '#958E84',
          muted: '#5E5850',
        },
        accent: {
          green: '#6ABF8A',
          'green-hover': '#5AAF7A',
          blue: '#E07838',
          'blue-hover': '#D06828',
        },
        gold: {
          DEFAULT: '#E8B84D',
          bright: '#F5CC65',
          muted: '#C49A3A',
        },
        orange: '#E07838',
        rose: '#D4607A',
        surface: {
          DEFAULT: 'rgba(255,245,230,0.10)',
          hover: 'rgba(255,245,230,0.14)',
          bright: 'rgba(255,245,230,0.18)',
        },
        // New brand colors
        blaze: { DEFAULT: '#F06820', hot: '#FF8828', deep: '#D45A10' },
        slate: { DEFAULT: '#1E2A3A', mid: '#2C3E50', light: '#3D5166' },
        field: { DEFAULT: '#0D9668', bright: '#14B880' },
        crown: { DEFAULT: '#D4930D', bright: '#F0B429' },
        'live-red': '#E83838',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Bricolage Grotesque', 'system-ui', 'sans-serif'],
        body: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        editorial: ['Instrument Serif', 'Georgia', 'serif'],
      },
      borderRadius: {
        'card': '16px',
        'card-lg': '20px',
        'button': '12px',
        'badge': '6px',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.03)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
        'glow-gold': '0 0 20px rgba(232, 184, 77, 0.3)',
        'glow-green': '0 0 20px rgba(106, 191, 138, 0.3)',
        'glow-blue': '0 0 20px rgba(224, 120, 56, 0.3)',
        'button': '0 2px 4px rgba(0, 0, 0, 0.2)',
        'button-hover': '0 4px 12px rgba(232, 184, 77, 0.3)',
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-down': 'slide-down 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-up': 'scale-up 0.2s ease-out',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-up': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      transitionDuration: {
        '300': '300ms',
      },
    },
  },
  plugins: [],
}
