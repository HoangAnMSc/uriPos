/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        mist: '#f4f8fb',
        aqua: '#78d6ff',
        skyglass: '#d8f1ff',
        frost: '#f8fcff',
        line: 'rgba(148, 163, 184, 0.22)',
        success: '#1f9d6b',
        warning: '#e59c2f',
        danger: '#d54d4d'
      },
      fontFamily: {
        sans: ['Manrope', 'Segoe UI Variable', 'sans-serif']
      },
      boxShadow: {
        glass: '0 24px 80px rgba(15, 23, 42, 0.10)',
        soft: '0 12px 36px rgba(15, 23, 42, 0.08)'
      },
      backdropBlur: {
        xs: '2px'
      },
      borderRadius: {
        '4xl': '2rem'
      }
    }
  },
  plugins: []
};
