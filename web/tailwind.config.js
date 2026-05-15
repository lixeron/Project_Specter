/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        specter: {
          red: "#e74c3c",
          blue: "#3498db",
          green: "#2ecc71",
          yellow: "#f39c12",
          purple: "#9b59b6",
        },
      },
    },
  },
  plugins: [],
};
