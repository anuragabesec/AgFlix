/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#05070F',       // Deep obsidian dark space
          surface: '#0F1221',    // Charcoal surface overlay
          surfaceMuted: '#171C35',
          primary: '#8A3FFC',    // Vibrant electric violet/purple
          primaryHover: '#7033D1',
          secondary: '#00F0FF',  // Neon Cyan / electric blue
          accent: '#FF007A',     // Neon pink accent
          text: '#F4F5F7',       // Premium bright off-white
          textMuted: '#98A2B3'   // Muted gray-blue
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'neon': '0 0 15px rgba(138, 63, 252, 0.4)',
        'neon-cyan': '0 0 15px rgba(0, 240, 255, 0.4)'
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
