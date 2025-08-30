/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        cyber: {
          100: '#E0F7FA',
          200: '#B2EBF2',
          300: '#80DEEA',
          400: '#4DD0E1',
          500: '#26C6DA',
          600: '#00BCD4',
          700: '#00ACC1',
          800: '#0097A7',
          900: '#00838F',
        },
        'glow-pink': '#EC4899',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Orbitron', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 15px 5px rgba(77, 208, 225, 0.3)',
        'glow-lg': '0 0 25px 10px rgba(77, 208, 225, 0.3)',
        'glow-gold': '0 0 25px 10px rgba(250, 204, 21, 0.4)',
        'glow-silver': '0 0 25px 10px rgba(209, 213, 219, 0.4)',
        'glow-bronze': '0 0 25px 10px rgba(236, 72, 153, 0.4)',
      },
      keyframes: {
        'subtle-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'pulse-strong': {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 15px 5px rgba(77, 208, 225, 0.3)' },
          '50%': { transform: 'scale(1.02)', boxShadow: '0 0 25px 15px rgba(77, 208, 225, 0.4)' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-indicator-green': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.7)' },
          '70%': { boxShadow: '0 0 0 10px rgba(34, 197, 94, 0)' },
        },
        'pulse-indicator-red': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)' },
          '70%': { boxShadow: '0 0 0 10px rgba(239, 68, 68, 0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'trace-border': {
          '0%': { 'clip-path': 'polygon(0% 0%, 100% 0%, 100% 2px, 0% 2px)' },
          '25%': { 'clip-path': 'polygon(0% 0%, 100% 0%, 100% 100%, 98% 100%, 98% 2px, 0% 2px)' },
          '50%': { 'clip-path': 'polygon(0% 100%, 100% 100%, 100% 0, 98% 0, 98% 98%, 0% 98%)' },
          '75%': { 'clip-path': 'polygon(0% 0%, 0% 100%, 100% 100%, 100% 98%, 2px 98%, 2px 0%)' },
          '100%': { 'clip-path': 'polygon(0% 0%, 0% 100%, 2px 100%, 2px 2px, 100% 2px, 100% 0%)' },
        },
      },
      animation: {
        'subtle-pulse': 'subtle-pulse 4s infinite ease-in-out',
        'spin-slow': 'spin-slow 20s linear infinite',
        'pulse-strong': 'pulse-strong 3s infinite ease-in-out',
        'pop-in': 'pop-in 0.3s ease-out forwards',
        'pulse-indicator-green': 'pulse-indicator-green 2s infinite',
        'pulse-indicator-red': 'pulse-indicator-red 2s infinite',
        'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
        'trace-border': 'trace-border 2s infinite linear',
      },
    },
  },
  plugins: [],
};

