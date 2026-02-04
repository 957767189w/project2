/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef8ff',
          100: '#d8eeff',
          200: '#b9e1ff',
          300: '#89d0ff',
          400: '#52b4ff',
          500: '#2a91ff',
          600: '#0d6efd',
          700: '#0c5ae9',
          800: '#1149bc',
          900: '#144094',
        },
      },
    },
  },
  plugins: [],
};
