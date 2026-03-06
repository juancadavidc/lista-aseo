/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          50: '#faf8f5',
          100: '#f4f1ec',
          200: '#ece7df',
          300: '#ddd5c8',
          400: '#c4b8a6',
        },
        clay: {
          400: '#c4714f',
          500: '#b85a3a',
          600: '#9e4a2e',
        },
        moss: {
          100: '#e6ede4',
          200: '#c3d6be',
          300: '#94b78c',
          400: '#6a9960',
          500: '#4d7a44',
          600: '#385c32',
        },
        bark: {
          100: '#e8ddd0',
          200: '#c4b49e',
          300: '#9e8b72',
          400: '#7a6a52',
          500: '#5c4e3a',
          600: '#3d3426',
          700: '#2a231a',
          800: '#1a1614',
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(26,22,20,0.06), 0 6px 16px rgba(26,22,20,0.04)',
        'card-hover': '0 2px 8px rgba(26,22,20,0.08), 0 12px 32px rgba(26,22,20,0.06)',
        'glow-moss': '0 0 20px rgba(106,153,96,0.15)',
        'glow-clay': '0 0 20px rgba(184,90,58,0.15)',
      },
      animation: {
        'ripple': 'ripple 0.6s ease-out forwards',
        'check-draw': 'checkDraw 0.4s cubic-bezier(0.65, 0, 0.35, 1) forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'progress-fill': 'progressFill 1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
