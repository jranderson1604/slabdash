/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fffaf8',
          100: '#fff0ec',
          200: '#ffe0d8',
          300: '#ffc8ba',
          400: '#ffa894',
          500: '#FF8170',
          600: '#ff6b59',
          700: '#e8543d',
          800: '#c74430',
          900: '#a03626',
        }
      }
    },
  },
  plugins: [],
}
