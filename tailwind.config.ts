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
        "ground-deep": "var(--background-deep)",
        surface: "var(--surface)",
        raised: "var(--surface-raised)",
        ink: "var(--foreground)",
        "ink-2": "var(--ink-secondary)",
        "ink-3": "var(--ink-tertiary)",
        "ink-muted": "var(--ink-muted)",
        accent: "var(--accent)",
        "accent-bright": "var(--accent-bright)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
      },
      borderRadius: {
        glass: "var(--radius-glass)",
      },
      transitionTimingFunction: {
        brand: "cubic-bezier(0.2, 0.7, 0.2, 1)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      backgroundImage: {
        "stage-radial":
          "radial-gradient(ellipse 70% 60% at 50% 45%, transparent 0%, rgba(12,14,18,0.18) 55%, rgba(12,14,18,0.62) 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
