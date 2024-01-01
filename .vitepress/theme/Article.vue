<script setup lang="ts">
import { useData, useRoute } from "vitepress";
import { computed } from "vue";
import Date from "./Date.vue";
import { data as posts } from "./posts.data.js";

const { frontmatter: data } = useData();

const route = useRoute();

const date = computed(
  () => posts.find((post) => post.url === route.path)?.date
);
</script>

<template>
  <article class="prose">
    <header class="pt-6 xl:pb-10 space-y-2">
      <h1
        class="text-2xl leading-9 font-extrabold sm:text-4xl sm:leading-10 md:text-5xl md:leading-14 m-0"
      >
        {{ data.title }}
      </h1>
      <Date :date="date" />
    </header>

    <div class="divide-y xl:divide-y-0 divide-neutral-200">
      <div
        class="divide-y divide-neutral-200 xl:pb-0 xl:col-span-3 xl:row-span-2"
      >
        <Content class="" />
      </div>
    </div>
  </article>
</template>
