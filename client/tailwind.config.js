/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          DEFAULT: '#090a0d',
          base: '#060709',
          surface: '#0f1115',
          elevated: '#15181e',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-subtle': 'rgba(255, 255, 255, 0.04)',
          'border-focus': 'rgba(255, 255, 255, 0.2)',
        },
        titanium: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        editorial: ['Cinzel', 'serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      letterSpacing: {
        'tightest': '-0.035em',
        'tighter': '-0.02em',
        'wide-tag': '0.18em',
        'widest-tag': '0.24em',
      },
    },
  },
  plugins: [],
}



