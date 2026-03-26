/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          navy:    '#0a0f1a',
          blue:    '#3b82f6',
          teal:    '#14b8a6',
          green:   '#22c55e',
          surface: '#111827',
          orange:  '#f59e0b',
        },
      },
    },
  },
  plugins: [],
};
