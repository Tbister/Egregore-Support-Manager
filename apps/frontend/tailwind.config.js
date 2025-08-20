/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hvac: {
          blue: '#0369a1',
          green: '#059669',
          gray: '#6b7280',
          light: '#f3f4f6'
        }
      }
    },
  },
  plugins: [],
}