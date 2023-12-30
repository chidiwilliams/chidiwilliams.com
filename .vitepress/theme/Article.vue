<script setup lang="ts">
import { useData, useRoute } from 'vitepress';
import { computed } from 'vue';
import Author from './Author.vue';
import Date from './Date.vue';
import { data as posts } from './posts.data.js';

const { frontmatter: data } = useData();

const route = useRoute();

function findCurrentIndex() {
  return posts.findIndex((p) => p.url === route.path);
}

const date = computed(() => posts[findCurrentIndex()].date);
const nextPost = computed(() => posts[findCurrentIndex() - 1]);
const prevPost = computed(() => posts[findCurrentIndex() + 1]);
</script>

<template>
  <article class="">
    <header class="pt-6 xl:pb-10 space-y-1">
      <h1
        class="text-2xl leading-9 font-extrabold sm:text-4xl sm:leading-10 md:text-5xl md:leading-14"
      >
        {{ data.title }}
      </h1>
      <Date :date="date" />
    </header>

    <div
      class="divide-y xl:divide-y-0 divide-neutral-200"
    >
      <div class="divide-y divide-neutral-200 xl:pb-0 xl:col-span-3 xl:row-span-2">
        <Content
          class="prose prose-code:before:content-none prose-code:after:content-none max-w-prose pb-8 prose-p:text-[18px] prose-p:leading-[28px] prose-h2:text-lg prose-p:text-orange-950 prose-a:text-orange-950 prose-h1:text-orange-950 prose-h2:text-orange-950 prose-li:text-orange-950 prose-strong:text-orange-950"
        />
      </div>
    </div>
  </article>
</template>
