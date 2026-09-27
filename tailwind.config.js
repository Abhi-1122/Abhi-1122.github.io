/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["selector", '[data-palette="light"]'],
  content: ["./app/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        gb: {
          0: "var(--gb-0)",
          1: "var(--gb-1)",
          2: "var(--gb-2)",
          3: "var(--gb-3)",
          hi: "var(--gb-hi)",
        },
        shell: {
          DEFAULT: "var(--shell)",
          hi: "var(--shell-hi)",
          lo: "var(--shell-lo)",
          ink: "var(--shell-ink)",
        },
        bezel: "var(--bezel)",
        dpad: "var(--dpad)",
        ab: { DEFAULT: "var(--btn-ab)", lo: "var(--btn-ab-lo)" },
        cyan: {
          switch: "#00C3E3",
        },
        red: {
          switch: "#E60012",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "monospace"],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "spin-slow": "spin-slow 1.1s steps(8) infinite",
      },
    },
  },
  plugins: [],
};
