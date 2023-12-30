<script setup lang="ts">
import Date from './Date.vue';
import { data as posts } from './posts.data';
import { useData } from 'vitepress';

const { frontmatter } = useData();
</script>

<template>
  <div class="divide-y divide-gray-200">
    <div class="pt-6 pb-8 space-y-2 md:space-y-5">
      <h1
        class="text-3xl leading-9 font-extrabold sm:text-4xl sm:leading-10 md:text-6xl md:leading-14"
      >
        {{ frontmatter.title }}
      </h1>
      <p class="text-lg leading-7">
        {{ frontmatter.subtext }}
      </p>
    </div>
    <ul class="divide-y divide-gray-200">
      <li class="py-12" v-for="{ title, url, date, excerpt } of posts">
        <article class="space-y-2 xl:grid xl:grid-cols-4 xl:space-y-0 xl:items-baseline">
          <Date :date="date" />
          <div class="space-y-5 xl:col-span-3">
            <div class="space-y-6">
              <h2 class="text-2xl leading-8 font-bold">
                <a class="" :href="url">{{ title }}</a>
              </h2>
              <div
                v-if="excerpt"
                class="prose max-w-none"
                v-html="excerpt"
              ></div>
            </div>
            <div class="text-base leading-6 font-medium">
              <a class="link" aria-label="read more" :href="url">Read more →</a>
            </div>
          </div>
        </article>
      </li>
    </ul>
  </div>
</template>
