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
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
      },
    ],
  ],
  themeConfig: {
    socialLinks: [{ icon: 'github', link: 'https://github.com/chidiwilliams' }],
  },
});
