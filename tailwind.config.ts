import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ground: "var(--background)",
        surface: "var(--surface)",
        raised: "var(--surface-raised)",
        ink: "var(--foreground)",
        "ink-2": "var(--ink-secondary)",
        "ink-3": "var(--ink-tertiary)",
        accent: "var(--accent)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
      },
      borderRadius: {
        glass: "var(--radius-glass)",
      },
      transitionTimingFunction: {
        brand: "cubic-bezier(0.2, 0.7, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
