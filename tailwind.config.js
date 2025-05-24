// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Make sure this covers your file types
  ],
  theme: {
    extend: {
      // Your theme extensions (colors, fonts, etc.)
      fontFamily: {
        sans: ['Inter', /* ... other fallback fonts */],
      },
      colors: {
        primary: {
          DEFAULT: '#5A67D8',
          light: '#818CF8',
        },
        accent: {
          positive: '#34D399',
          negative: '#F87171',
        },
        neutral: {
          background: '#F7FAFC',
          'background-alt': '#EDF2F7',
          text: '#2D3748',
          'text-light': '#4A5568',
        },
      },
      boxShadow: {
        subtle: '0 2px 4px rgba(0,0,0,0.05)',
        card: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'), // This is the line causing the error if not installed
    // ... any other plugins
  ],
}