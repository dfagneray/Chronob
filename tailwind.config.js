/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        surface2: v('surface2'),
        ink: v('ink'),
        muted: v('muted'),
        line: v('line'),
        gold: v('gold'),
        goldsoft: v('goldsoft'),
        blood: v('blood'),
        mana: v('mana'),
        luck: v('luck'),
        leaf: v('leaf'),
      },
      fontFamily: {
        // polices pilotées par le thème (variables CSS dans index.css)
        display: ['var(--f-titre)'],
        body: ['var(--f-texte)'],
        ui: ['var(--f-texte)'],
        num: ['var(--f-chiffre)'],
      },
    },
  },
  plugins: [],
};
