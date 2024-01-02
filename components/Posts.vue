<script setup lang="ts">
import { useData } from "vitepress";
import Project from "./Project.vue";

const { frontmatter, site } = useData();
const projects = site.value.themeConfig.projects;
import { data as posts } from "../.vitepress/theme/posts.data";
import Post from "./Post.vue";

const postsByYear = posts.reduce((acc, post) => {
  const year = new Date(post.date.time).getFullYear();
  if (!acc[year]) {
    acc[year] = [];
  }
  acc[year].push(post);
  return acc;
}, {});

const years = Object.keys(postsByYear).sort((a, b) => Number(b) - Number(a));
const postsAndYears = years.map((year) => ({
  year,
  posts: postsByYear[year],
}));
</script>

<template>
  <main class="space-y-12">
    <div class="space-y-4" v-for="{ year, posts } of postsAndYears">
      <h2 class="text-3xl font-semibold">
        {{ year }}
      </h2>
      <Post v-for="post of posts" :post="post"></Post>
    </div>
  </main>
</template>
