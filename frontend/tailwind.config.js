
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Theme-aware colors using CSS variables
        theme: {
          bg: 'var(--bg-primary)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          text: 'var(--text-primary)',
          muted: 'var(--text-muted)',
          border: 'var(--border-color)',
          subtle: 'var(--border-subtle)',
          overlay: 'var(--overlay)',
          glass: 'var(--glass-bg)',
          'glass-border': 'var(--glass-border)',
          glow: 'var(--glow-gold)',
        },
        // Legacy/Specific colors
        charcoal: {
          DEFAULT: '#0D0D0D',
          light: '#1A1A1A',
          lighter: '#2A2A2A',
        },
        gold: {
          DEFAULT: '#C9A84C',
          light: '#D4B96A',
          dim: '#8B7A3E',
        },
        brass: {
          DEFAULT: '#B08D57',
          dark: '#8B7355',
        },
        cream: {
          DEFAULT: '#F5F0E8',
          muted: '#C4BEB4',
        },
        muted: {
          DEFAULT: '#9A9A9A',
        }
      },
      seniqu: {
        dark: '#0a0a0a',
        burgundy: '#4a0a10',
        gold: {
          DEFAULT: '#b8860b',
          light: '#cfb53b',
        },
        cream: '#f5f5f5',
        sandstone: '#d2b48c',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'fade-in': 'fadeIn 1s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
        'marquee': 'marquee 30s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float-slow': 'float-slow 8s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'spin-slow': {
          'from': { transform: 'rotate(0deg)' },
          'to': { transform: 'rotate(360deg)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 10px var(--glow-gold)' },
          '50%': { boxShadow: '0 0 20px var(--glow-gold), 0 0 10px var(--text-gold)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
}
