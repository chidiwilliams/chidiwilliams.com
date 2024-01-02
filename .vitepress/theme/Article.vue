<script setup lang="ts">
import { useData, useRoute } from "vitepress";
import { computed } from "vue";
import DateC from "./Date.vue";
import { data as posts } from "./posts.data";

const { frontmatter, site } = useData();

const route = useRoute();

const date = computed(
  () => new Date(posts.find((post) => post.url === route.path)?.date.time)
);
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 xl:max-w-5xl xl:px-0 pb-12">
    <header class="py-10">
      <h1 class="">
        <a
          href="/"
          class="mt-1 text-sm gap-6 font-sans transition transition-all opacity-80 hover:opacity-100"
          >← Home</a
        >
      </h1>
    </header>

    <main class="">
      <article class="prose">
        <header class="pt-6 xl:pb-10 space-y-2">
          <h1 class="text-2xl font-extrabold sm:text-4xl md:text-5xl m-0">
            {{ frontmatter.title }}
          </h1>
          <DateC :date="date" />
        </header>

        <div class="divide-y xl:divide-y-0 divide-neutral-200">
          <div
            class="divide-y divide-neutral-200 xl:pb-0 xl:col-span-3 xl:row-span-2"
          >
            <Content />
          </div>
        </div>
      </article>
    </main>
  </div>
</template>
