import tailwindTypography from "@tailwindcss/typography";
import tailwind from "tailwindcss";

export default {
  plugins: [
    tailwind({
      content: ["./.vitepress/theme/**/*.vue", "./components/**/*.vue"],
      theme: {
        extend: {
          fontFamily: {
            sans: [
              "Inter",
              'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
            ],
            serif: ['"Source Serif 4"'],
          },
          typography: ({ theme }) => ({
            DEFAULT: {
              css: {
                "--tw-prose-bullets": theme("colors.yellow.800"),
                "--tw-prose-counters": theme("colors.yellow.800"),
                "--tw-prose-links": theme("colors.orange.950"),
                "--tw-prose-body": theme("colors.orange.950"),
                "--tw-prose-bold": theme("colors.orange.950"),
                "--tw-prose-headings": theme("colors.orange.950"),
                "--tw-prose-code": theme("colors.orange.950"),
                "--tw-prose-quotes": theme("colors.yellow.950"),
                pre: {
                  "background-color": "#fcfcfa",
                  "font-size": "13px",
                  "line-height": "21px",
                },
                figure: {
                  background: "#fcfcfa",
                  "border-radius": "0.375rem",
                  padding: "0.625rem",
                  figcaption: {
                    "margin-top": "0.625rem",
                    color: "#7b7e7f",
                  },
                },
                a: {
                  "font-weight": "normal",
                },
                p: {
                  "font-size": "1.125rem",
                  "line-height": "1.75rem",
                },
                h2: {
                  "font-size": "1.5rem",
                },
                code: {
                  "font-weight": "normal",
                },
                "code::before": {
                  content: "none",
                },
                "code::after": {
                  content: "none",
                },
                blockquote: {
                  opacity: "0.8",
                  "border-color": "#42200620",
                  p: {
                    "font-size": "1rem",
                    "line-height": "1.65rem",
                  },
                },
                hr: {
                  "border-color": "#42200620",
                },
              },
            },
          }),
        },
      },
      plugins: [tailwindTypography],
    }),
  ],
};
