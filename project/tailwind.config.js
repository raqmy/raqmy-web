/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      colors: {
        primary: '#2563EB',
        secondary: '#7C3AED',
        accent: '#F97316',
      },
    },
  },
  plugins: [],
};
