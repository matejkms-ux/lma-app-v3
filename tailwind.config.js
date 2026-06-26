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
        khmer: fonts.khmer,
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
        // Super-app coral signals (gathered from the design brief).
        // Soft attention pulse — the "+N today" chip and current-lesson dot.
        pulse: {
          '0%,100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.06)', opacity: '.92' },
        },
        // Expanding ring — the Companion orb while the mic is listening.
        listen: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(239,106,71,.5)' },
          '50%': { boxShadow: '0 0 0 30px rgba(239,106,71,0)' },
        },
        // Breathing ring — the Companion orb while audio plays.
        orbBreathe: {
          '0%,100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(239,106,71,.35)' },
          '50%': { transform: 'scale(1.04)', boxShadow: '0 0 0 22px rgba(239,106,71,0)' },
        },
        // Listening equalizer bars.
        wave: {
          '0%,100%': { height: '18%' },
          '50%': { height: '90%' },
        },
        // Bottom sheet rising in.
        rise: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        pring: 'pring 1.9s infinite ease-out',
        bwave: 'bwave .8s infinite ease-in-out',
        breathe: 'breathe 2.4s infinite ease-in-out',
        pop: 'pop .5s cubic-bezier(.18,.9,.3,1.2) both',
        pulse: 'pulse 2.4s infinite ease-in-out',
        listen: 'listen 1s infinite ease-out',
        'orb-breathe': 'orbBreathe 3.4s infinite ease-in-out',
        wave: 'wave .7s infinite ease-in-out',
        rise: 'rise .26s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
};
