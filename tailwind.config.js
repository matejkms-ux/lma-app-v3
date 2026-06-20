import { colors, fonts, radius } from './src/tokens.ts';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        emerald: colors.emerald,
        emerald2: colors.emerald2,
        coral: colors.coral,
        cream: colors.cream,
        'cream-panel': colors.creamPanel,
        teal: colors.teal,
        'teal-dim': colors.tealDim,
        heading: colors.heading,
        muted: colors.muted,
        rule: colors.rule,
        'rule-soft': colors.ruleSoft,
        'star-empty': colors.starEmpty,
        locked: colors.locked,
      },
      fontFamily: {
        serif: fonts.serif,
        sans: fonts.sans,
        jp: fonts.jp,
      },
      borderRadius: {
        device: radius.device,
      },
      keyframes: {
        // Coral is the ONLY thing that moves.
        pring: {
          '0%,100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(2.3)', opacity: '0' },
        },
        bwave: {
          '0%,100%': { transform: 'scaleY(.28)' },
          '50%': { transform: 'scaleY(1)' },
        },
        // Gentle "now playing" breathing for the listening orb.
        breathe: {
          '0%,100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        // One-shot celebratory pop for the "+N reps" reward.
        pop: {
          '0%': { transform: 'scale(.6)', opacity: '0' },
          '55%': { transform: 'scale(1.12)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        pring: 'pring 1.9s infinite ease-out',
        bwave: 'bwave .8s infinite ease-in-out',
        breathe: 'breathe 2.4s infinite ease-in-out',
        pop: 'pop .5s cubic-bezier(.18,.9,.3,1.2) both',
      },
    },
  },
  plugins: [],
};
