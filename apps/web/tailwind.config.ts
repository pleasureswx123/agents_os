import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: '#dde3ee',
        surface: '#ffffff',
        ink: '#18202f',
        muted: '#596579'
      }
    }
  },
  plugins: []
} satisfies Config;
