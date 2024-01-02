import type { Theme } from "vitepress";
import Figure from "../../components/Figure.vue";
import IframeFigure from "../../components/IframeFigure.vue";
import Posts from "../../components/Posts.vue";
import Projects from "../../components/Projects.vue";
import Video from "../../components/Video.vue";
import Home from "./Home.vue";
import Layout from "./Layout.vue";
import "./style.css";

export default {
  Layout,
  enhanceApp(ctx) {
    ctx.app.component("Figure", Figure);
    ctx.app.component("IframeFigure", IframeFigure);
    ctx.app.component("Video", Video);
    ctx.app.component("Home", Home);
    ctx.app.component("Projects", Projects);
    ctx.app.component("Posts", Posts);
  },
} satisfies Theme;
