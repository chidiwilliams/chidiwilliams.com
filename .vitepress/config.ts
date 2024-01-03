import footnote from "markdown-it-footnote";
import { defineConfigWithTheme } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfigWithTheme({
  title: "Chidi Williams",
  description: "Chidi Williams' Blog",
  cleanUrls: true,
  markdown: {
    theme: "github-light",
    config: (md) => {
      md.use(footnote);
    },
    toc: {},
  },
  head: [
    ["meta", { name: "twitter:site", content: "@ChidiWilliams__" }],
    ["meta", { name: "twitter:card", content: "summary" }],
    ["meta", { name: "twitter:creator", content: "@ChidiWilliams__" }],
    [
      "meta",
      { name: "og:image", content: "https://chidiwilliams.com/favicon.ico" },
    ],
    [
      "meta",
      {
        name: "twitter:image:src",
        content: "https://chidiwilliams.com/favicon.ico",
      },
    ],
    [
      "link",
      {
        rel: "icon",
        type: "image/x-icon",
        href: "/favicon.ico",
      },
    ],
    [
      "link",
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossorigin: "true",
      },
    ],
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;0,8..60,700;0,8..60,800;0,8..60,900;1,8..60,400;1,8..60,500;1,8..60,600;1,8..60,700;1,8..60,800;1,8..60,900&display=swap",
      },
    ],
  ],
  themeConfig: {
    nav: [
      { text: "Projects", link: "/projects" },
      {
        text: "Writing",
        link: "/posts",
      },
    ],
    socialLinks: [
      {
        name: "Twitter",
        link: "https://twitter.com/ChidiWilliams__",
      },
      {
        name: "GitHub",
        link: "https://github.com/chidiwilliams",
      },
      {
        name: "LinkedIn",
        link: "https://www.linkedin.com/in/chidiwilliams/",
      },
      {
        name: "Email",
        link: "mailto:williamschidi1@gmail.com",
      },
    ],
    talks: [
      {
        title: "Hearing Between the Lines",
        url: "https://talks.chidiwilliams.com/2023/hearing-between-the-lines",
        links: [
          {
            name: "YouTube",
            url: "https://www.youtube.com/watch?v=c_PK9HVw1sM&list=PLe4yUFawNXrxsqQ7xPLUiB5J1TyPqfpP2",
          },
        ],
        date: "2023-08-16",
      },
      {
        title: "Classical Synchronization Problems",
        url: "https://talks.chidiwilliams.com/2023/classical-synchronization-problems",
        date: "2023-12-07",
      },
    ],
    projects: [
      {
        name: "SysDsgn",
        link: "https://bento.me/sysdsgn",
        description:
          "Community hosting conversations on software systems design. Organizers of SysDsgn Twitter Spaces and SysConf.",
        links: [
          {
            name: "Twitter",
            link: "https://twitter.com/sysdsgn",
          },
        ],
      },
      {
        name: "GPT Automator",
        link: "https://github.com/chidiwilliams/GPT-Automator",
        description:
          "A voice-controlled Mac assistant using Whisper and GPT-3.",
        links: [
          {
            name: "Blog",
            link: "https://chidiwilliams.com/post/gpt-automator/",
          },
        ],
      },
      {
        name: "Buzz Captions",
        link: "https://apps.apple.com/us/app/buzz-captions/id6446018936",
        description:
          "Speech-to-text transcription and translation app on macOS powered by OpenAI's Whisper.",
      },
      {
        name: "Buzz",
        link: "https://github.com/chidiwilliams/buzz",
        description: "Open-source, cross-platform version of Buzz Captions.",
      },
      {
        name: "Lox Playground",
        link: "https://chidiwilliams.github.io/lox-playground/",
        description:
          "A web-based REPL and web editor for running Lox programs. The playground runs Loxjs, a JavaScript implementation of the tree-walking interpreter from Bob Nystrom's Crafting Interpreters.",
        links: [
          {
            name: "Source",
            link: "https://github.com/chidiwilliams/lox-playground",
          },
        ],
      },
      {
        name: "Glox",
        link: "https://github.com/chidiwilliams/glox",
        description: "A Go implementation of the Lox interpreter.",
      },
      {
        name: "Wordle AI",
        link: "https://github.com/chidiwilliams/wordle",
        description: "A Wordle solver.",
        links: [
          {
            name: "Blog",
            link: "https://chidiwilliams.com/post/a-wordle-solver/",
          },
        ],
      },
      {
        name: "Expression Evaluator",
        link: "https://chidiwilliams.github.io/expression-evaluator/",
        description: "A math expression evaluator built with JavaScript.",
        links: [
          {
            name: "Source",
            link: "https://github.com/chidiwilliams/expression-evaluator",
          },
          {
            name: "Blog",
            link: "https://chidiwilliams.com/post/evaluator/",
          },
        ],
      },
      {
        name: "GitHub Stories",
        link: "https://github.com/chidiwilliams/github-stories",
        description:
          "A playful Chrome extension for viewing stories on your GitHub dashboard.",
      },
    ],
  },
});
