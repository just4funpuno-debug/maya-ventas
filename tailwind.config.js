/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eeeeee', // light
          100: '#eeeeee',
          500: '#ea9216', // primary accent
          600: '#d88210',
          700: '#c6730d',
          800: '#3a4750', // dark gray-blue
          900: '#313841', // darker
        }
      },
      backgroundColor: {
        base: '#313841',
        surface: '#3a4750',
        accent: '#ea9216',
        soft: '#eeeeee'
      },
      textColor: {
        base: '#eeeeee',
        accent: '#ea9216'
      },
      borderColor: {
        base: '#3a4750',
        strong: '#ea9216'
      }
    }
  },
  plugins: [],
}
