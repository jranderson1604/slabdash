/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF5F3',
          100: '#FFE8E3',
          200: '#FFD1C7',
          300: '#FFB5A5',
          400: '#FF9483',
          500: '#FF8170',
          600: '#FF6B56',
          700: '#E85A46',
          800: '#C74A38',
          900: '#A03A2C',
        }
      }
    },
  },
  plugins: [],
}
