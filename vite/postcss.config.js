import tailwindTypography from '@tailwindcss/typography';
import tailwind from 'tailwindcss';

export default {
  plugins: [
    tailwind({
      content: ['./.vitepress/theme/**/*.vue', './components/**/*.vue'],
      theme: {
        extend: {
          fontFamily: {
            sans: [
              'Inter',
              'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
            ],
          },
          typography: {
            DEFAULT: {
              css: {
                color: '#232323',
                pre: {
                  'background-color': '#fbfbfb',
                  'font-size': '13px',
                  'line-height': '21px',
                },
                a: {
                  'font-weight': 'normal',
                },
              },
            },
          },
        },
      },
      plugins: [tailwindTypography],
    }),
  ],
};
