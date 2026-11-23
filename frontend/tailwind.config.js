/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crm: {
          bg: '#F7F7FC',
          sidebar: '#211B3B',
          primary: '#6D42D8',
          'primary-hover': '#5B33C2',
          light: '#DCD3FF',
          dark: '#202033',
          muted: '#6B7280',
          border: '#E5E7EB',
          card: '#FFFFFF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(0, 0, 0, 0.04)',
        'card': '0 4px 20px -2px rgba(109, 66, 216, 0.06)',
      }
    },
  },
  plugins: [],
}
