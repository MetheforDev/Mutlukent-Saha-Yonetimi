/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sea:    { 900:'#081520', 850:'#0b1d2b', 800:'#0e2233', 700:'#163349' },
        line:   '#1d3b53',
        foam:   '#3fe0c5',
        violet: '#9d8bff',
        amber:  '#ffb454',
        coral:  '#ff6b5c',
        ink:    '#eaf4f4',
        mute:   '#7e9aaa',
      },
      fontFamily: {
        disp: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
