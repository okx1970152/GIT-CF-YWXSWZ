import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "Times New Roman", "serif"]
      }
    }
  },
  plugins: [typography]
};

export default config;
