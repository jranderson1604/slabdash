/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
           50: '#ffd5b9',
          100: '#ffcdab',
          200: '#ffd8be',
          300: '#ffcfaf',
          400: '#f89683',
          500: '#FD7B62',
          600: '#f76d51',
          700: '#FD7B62',
          800: '#FD7B62',
          900: '#FD7B62',
        }
      }
    },
  },
  plugins: [],
}
