import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  safelist: [
    'from-purple-700', 'to-cyan-500',
    'from-amber-400', 'to-amber-600',
    'from-emerald-500', 'to-teal-600',
    'from-green-600', 'to-green-800',
    'from-rose-500', 'to-pink-600',
  ],
  plugins: [],
};
export default config;
