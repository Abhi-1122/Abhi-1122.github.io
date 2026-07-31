/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cyan: {
          switch: "#00C3E3",
        },
        red: {
          switch: "#E60012",
        },
      },
      fontFamily: {
        sans: ["var(--font-rubik)", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["var(--font-space-mono)", "monospace"],
      },
      keyframes: {
        drift: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(3%, 4%) scale(1.08)" },
          "66%": { transform: "translate(-3%, -2%) scale(0.96)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        drift: "drift 26s ease-in-out infinite",
        "drift-slow": "drift 32s ease-in-out infinite",
        "drift-fast": "drift 20s ease-in-out infinite",
        "spin-slow": "spin-slow 1.1s linear infinite",
      },
    },
  },
  plugins: [],
};
