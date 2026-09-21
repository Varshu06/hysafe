import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0284C7',
        'primary-dark': '#0C4A6E',
        'primary-light': '#38BDF8',
        secondary: '#FFFFFF',
        accent: '#F0F9FF',
        surface: '#E0F2FE',
        'text-primary': '#0F172A',
        'text-secondary': '#64748B',
        success: '#0EA5E9',
        warning: '#F59E0B',
        danger: '#EF4444',
        border: '#BAE6FD',
      },
      borderColor: {
        DEFAULT: '#BAE6FD',
      },
    },
  },
  plugins: [],
} satisfies Config
