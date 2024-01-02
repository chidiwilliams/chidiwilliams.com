<script setup lang="ts">
import { useData } from "vitepress";
import Project from "../../components/Project.vue";
import DateComponent from "./Date.vue";
import { data as posts } from "./posts.data";
import Post from "../../components/Post.vue";

const { site } = useData();
const recentPosts = posts.slice(0, 5);
const projects = site.value.themeConfig.projects;
const recentProjects = projects.slice(0, 5);
</script>

<template>
  <main class="grid gap-12 sm:grid-cols-2 xl:grid-cols-3">
    <div
      class="space-y-6 border-b xl:border-none border-[#42200620] pb-6 sm:col-span-2 xl:col-span-1"
    >
      <div class="text-2xl">
        I'm a Nigerian software engineer living in London, UK. I love writing
        software and stories.
      </div>
      <nav>
        <ul class="text-sm flex flex-col gap-2 font-sans">
          <li v-for="{ name, link } of site.themeConfig.socialLinks">
            <a :href="link" class="transition transition-all opacity-80 hover:opacity-100">{{ name }}</a>
          </li>
        </ul>
      </nav>
    </div>

    <div class="space-y-4">
      <h2 class="text-2xl font-semibold">Writing</h2>
      <ul class="space-y-7">
        <li class="" v-for="post of recentPosts">
          <Post :post="post"></Post>
        </li>
      </ul>
      <div>
        <a href="/posts" class="text-sm font-semibold opacity-80"
          >See all {{ posts.length }} posts →</a
        >
      </div>
    </div>

    <div class="space-y-4 sm:row-span-2">
      <h2 class="text-2xl font-semibold">Projects</h2>
      <ul class="space-y-7">
        <li v-for="project of recentProjects">
          <Project :project="project"></Project>
        </li>
      </ul>
      <div>
        <a href="/projects" class="text-sm font-semibold opacity-80"
          >See all {{ projects.length }} projects →</a
        >
      </div>
    </div>

    <div class="space-y-4 xl:col-start-2">
      <h2 class="text-2xl font-semibold">Talks</h2>
      <ul class="space-y-7">
        <li v-for="{ title, url, date, links } of site.themeConfig.talks">
          <article>
            <h3 class="text-lg font-medium">
              <a :href="url">{{ title }}</a>
            </h3>
            <DateComponent :date="new Date(date)" />
          </article>
        </li>
      </ul>
    </div>
  </main>
</template>
