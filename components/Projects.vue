<script setup lang="ts">
import { useData } from "vitepress";
import Project from "./Project.vue";

const { frontmatter, site } = useData();
const projects = site.value.themeConfig.projects;
</script>

<template>
  <main class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
    <Project v-for="project of projects" :project="project"></Project>
  </main>
</template>
