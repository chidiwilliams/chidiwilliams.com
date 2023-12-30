<script setup lang="ts">
import { useData } from 'vitepress';
import Home from './Home.vue';
import Article from './Article.vue';
import NotFound from './NotFound.vue';

const { page, frontmatter, title, site } = useData();
</script>

<template>
  <div class="bg-orange-50 text-orange-950 font-serif">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 xl:max-w-5xl xl:px-0">
      <nav class="flex justify-between items-center py-10 font-bold">
        <a class="text-xl" href="/" aria-label="Chidi Williams">
          <span v-if="!frontmatter.index" class="inline">{{ site.title }}</span>
        </a>
      </nav>
    </div>
    <main class="max-w-3xl mx-auto px-4 sm:px-6 xl:max-w-5xl xl:px-0">
      <Home v-if="frontmatter.index" />
      <NotFound v-else-if="page.isNotFound" />
      <Article v-else />
    </main>
  </div>
</template>
