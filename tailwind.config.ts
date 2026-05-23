import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#F7F7F7',
          900: '#0B0B0B',
          950: '#050505',
        },
        charcoal: '#141414',
        gold: {
          deep: '#B8860B',
          metallic: '#D4AF37',
          bright: '#FFD700',
          antique: '#A67C00',
          tint: '#F3D675',
        },
        warmgrey: '#B8B8B8',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient':
          'linear-gradient(135deg, #A67C00 0%, #D4AF37 35%, #FFD700 55%, #D4AF37 75%, #B8860B 100%)',
        'gold-soft':
          'linear-gradient(135deg, rgba(166,124,0,0.18), rgba(212,175,55,0.32), rgba(255,215,0,0.22))',
        'noise':
          "radial-gradient(circle at 20% 10%, rgba(212,175,55,0.06), transparent 50%), radial-gradient(circle at 85% 80%, rgba(255,215,0,0.05), transparent 55%)",
      },
      boxShadow: {
        'gold-glow': '0 0 24px rgba(212, 175, 55, 0.35)',
        'gold-glow-lg': '0 0 60px rgba(212, 175, 55, 0.25)',
        'inset-gold': 'inset 0 0 0 1px rgba(212,175,55,0.35)',
      },
      letterSpacing: {
        luxe: '0.18em',
      },
      animation: {
        'fade-up': 'fadeUp 0.7s ease-out both',
        'shimmer': 'shimmer 6s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
