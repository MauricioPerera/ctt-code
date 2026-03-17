/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/mainview/**/*.{html,tsx,ts}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        editor: {
          bg: "#1e1e2e",
          sidebar: "#181825",
          panel: "#11111b",
          border: "#313244",
          active: "#cba6f7",
          text: "#cdd6f4",
          muted: "#6c7086",
          surface: "#1e1e2e",
          hover: "#313244",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', "Consolas", "monospace"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
