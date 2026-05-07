/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  // Safelist covers the dynamic `bg-${color}-50` etc. patterns the JSX uses.
  // Without these, Tailwind's JIT would purge them and category cards would render unstyled.
  safelist: [
    // Card backgrounds & borders for category accents
    { pattern: /bg-(emerald|teal|rose|amber|sky|violet|fuchsia|indigo|orange|red|green|blue|purple|pink|yellow)-(50|100|200|500|600|700|800|900)/ },
    { pattern: /text-(emerald|teal|rose|amber|sky|violet|fuchsia|indigo|orange|red|green|blue|purple|pink|yellow)-(400|500|600|700|800|900)/ },
    { pattern: /border-(emerald|teal|rose|amber|sky|violet|fuchsia|indigo|orange|red|green|blue|purple|pink|yellow)-(200|300|400|500)/ },
    { pattern: /from-(emerald|teal|rose|amber|sky|violet|fuchsia|indigo|orange|red|green|blue|purple|pink|yellow)-(50|100|400|500|600|700)/ },
    { pattern: /to-(emerald|teal|rose|amber|sky|violet|fuchsia|indigo|orange|red|green|blue|purple|pink|yellow)-(50|100|400|500|600|700)/ },
  ],
  theme: {
    extend: {
      colors: {
        // Reaction brand teals
        teal: {
          DEFAULT: "#003C3C",
          dark: "#002828",
        },
        emerald: {
          brand: "#00A87E",
        },
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
