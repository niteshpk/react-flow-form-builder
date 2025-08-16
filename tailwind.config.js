/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#0B0F12",
        panel: "#12181D",
      },
    },
  },
  plugins: [],
};
