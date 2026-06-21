/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B0C0E',
        panel: '#15171A',
        tally: '#E1262C',
        standby: '#F2A93B',
        cream: '#F4F1EA',
        muted: '#6B6F76',
        border: '#2A2D32',
        'panel-hover': '#1E2126',
      },
      fontFamily: {
        display: ['Oswald', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}

