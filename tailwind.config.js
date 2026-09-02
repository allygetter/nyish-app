/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#1F4D3A',
          dark: '#163828',
          light: '#2E6B4F',
        },
        gold: {
          DEFAULT: '#C9962B',
          light: '#E0B45C',
          dark: '#A87A1F',
        },
        clay: '#A8481E',
        cream: '#F7F5F0',
        ink: '#1C1C1A',
        line: '#E4E2DB',
      },
      fontFamily: {
        display: ['"Sora"', 'sans-serif'],
        body: ['"Work Sans"', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
      },
    },
  },
  plugins: [],
}
