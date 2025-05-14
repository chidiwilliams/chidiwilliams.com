import tailwindTypography from "@tailwindcss/typography";

export default {
  content: ["./src/app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
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
              padding: 0,
              "border-width": "1px",
              "border-radius": "0.375rem",
            },
            figure: {
              background: "#fcfcfa",
              "border-radius": "0.375rem",
              border: "1px solid #e0e0e0",
              figcaption: {
                padding: "0.625rem",
                margin: "0",
                "border-top": "1px solid #e0e0e0",
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
      colors: {
        foreground: "hsl(var(--color-foreground))",
        background: "hsl(var(--color-background))",
        secondary: {
          foreground: "hsl(var(--color-secondary-foreground))",
        },
      },
    },
  },
  plugins: [tailwindTypography],
};
