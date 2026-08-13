import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gym: {
          bg: 'var(--gym-bg, #0B0B0E)',
          surface: 'var(--gym-surface, #141418)',
          card: 'var(--gym-card, #18181C)',
          border: 'var(--gym-border, #27272F)',
          primary: 'var(--gym-primary, #CCFF00)',
          'primary-hover': 'var(--gym-primary-hover, #b8e600)',
          secondary: 'var(--gym-secondary, #1F1F24)',
          text: 'var(--gym-text, #FFFFFF)',
          muted: 'var(--gym-muted, #9494A0)',
          accent: 'var(--gym-accent, #88FF00)',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        neon: '0 0 20px rgba(204, 255, 0, 0.3)',
        'neon-strong': '0 0 35px rgba(204, 255, 0, 0.5)',
        card: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};

export default config;
