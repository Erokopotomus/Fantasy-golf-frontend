/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sleeper-inspired dark theme
        dark: {
          primary: '#1a1d26',    // Main background
          secondary: '#252a34',  // Cards, sections
          tertiary: '#2d323e',   // Hover states
          border: '#3d4354',     // Borders
        },
        text: {
          primary: '#ffffff',
          secondary: '#8b8d97',
          muted: '#5c5f6a',
        },
        accent: {
          green: '#17b978',
          'green-hover': '#14a36a',
          blue: '#3b82f6',
          'blue-hover': '#2563eb',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        'glow-green': '0 0 20px rgba(23, 185, 120, 0.3)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'button': '0 2px 4px rgba(0, 0, 0, 0.2)',
        'button-hover': '0 4px 12px rgba(23, 185, 120, 0.3)',
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-down': 'slide-down 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
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
      },
      transitionDuration: {
        '300': '300ms',
      },
    },
  },
  plugins: [],
}
