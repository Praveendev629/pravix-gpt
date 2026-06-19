import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        pravix: {
          purple: "#8B5CF6",
          red: "#EF4444",
          green: "#10B981",
          orange: "#F97316",
        }
      },
      animation: {
        "gradient": "gradient 8s ease infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "typing": "typing 1.5s steps(3) infinite",
      },
      keyframes: {
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" }
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 5px #8B5CF6, 0 0 10px #8B5CF6" },
          "50%": { boxShadow: "0 0 20px #8B5CF6, 0 0 40px #8B5CF6" }
        },
        typing: {
          "0%": { content: "." },
          "33%": { content: ".." },
          "66%": { content: "..." },
          "100%": { content: "." }
        }
      }
    }
  },
  plugins: []
};
export default config;
