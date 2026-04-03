import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#1D9E75',
        'accent-dark': '#0F6E56',
        'accent-light': '#E1F5EE',
        task: '#BA7517',
        'task-light': '#FAEEDA',
      },
      fontFamily: {
        sans: ['var(--font-dm)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}
export default config
