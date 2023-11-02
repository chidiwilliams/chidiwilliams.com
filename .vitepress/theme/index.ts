import type { Theme } from 'vitepress';
import Figure from '../../components/Figure.vue';
import IframeFigure from '../../components/IframeFigure.vue';
import Video from '../../components/Video.vue';
import Layout from './Layout.vue';
import './style.css';

export default {
  Layout,
  enhanceApp(ctx) {
    ctx.app.component('Figure', Figure);
    ctx.app.component('IframeFigure', IframeFigure);
    ctx.app.component('Video', Video);
  },
} satisfies Theme;
