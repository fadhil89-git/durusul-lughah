/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAFAF8",
        panel: "#FFFFFF",
        ink: "#1B1A18",
        muted: "#6B6A64",
        line: "#E7E5DF",
        accent: "#0F5C4E",
        "accent-soft": "#E5EFEC",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        arabic: [
          "Amiri",
          "Noto Naskh Arabic",
          "Scheherazade New",
          "Traditional Arabic",
          "Al Bayan",
          "serif",
        ],
      },
    },
  },
  plugins: [],
};
