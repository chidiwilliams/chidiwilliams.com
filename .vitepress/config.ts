import footnote from 'markdown-it-footnote';
import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Chidi Williams',
  description: "Chidi Williams' Blog",
  cleanUrls: true,
  // ignoreDeadLinks: true,
  markdown: {
    theme: 'github-light',
    config: (md) => {
      md.use(footnote);
    },
  },
  head: [
    ['meta', { name: 'twitter:site', content: '@ChidiWilliams__' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:creator', content: '@ChidiWilliams__' }],
    ['meta', { name: 'og:image', content: 'https://chidiwilliams.com/favicon.ico' }],
    ['meta', { name: 'twitter:image:alt', content: "Chidi Williams' Blog" }],
    ['meta', { name: 'twitter:title', content: 'Chidi Williams' }],
    ['meta', { name: 'twitter:description', content: "Chidi Williams' Blog" }],
    [
      'link',
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
    ],
    [
      'link',
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'true' },
    ],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;0,8..60,700;0,8..60,800;0,8..60,900;1,8..60,400;1,8..60,500;1,8..60,600;1,8..60,700;1,8..60,800;1,8..60,900&display=swap',
      },
    ],
  ],
  themeConfig: {
    socialLinks: [{ icon: 'github', link: 'https://github.com/chidiwilliams' }],
  },
});
