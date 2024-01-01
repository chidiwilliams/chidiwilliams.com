<script setup lang="ts">
import Date from "./Date.vue";
import { data as posts } from "./posts.data";
import { useData } from "vitepress";

const { frontmatter } = useData();
</script>

<template>
  <div class="">
    <div class="pt-6 pb-8 space-y-2 md:space-y-5">
      <h1
        class="text-2xl leading-9 font-extrabold sm:text-3xl sm:leading-10 md:text-5xl md:leading-14"
      >
        {{ frontmatter.title }}
      </h1>
      <p class="text-lg leading-7">
        {{ frontmatter.subtext }}
      </p>
    </div>
    <ul class="space-y-10">
      <li class="" v-for="{ title, url, date, excerpt } of posts">
        <article class="space-y-2">
          <div class="space-y-5 xl:col-span-3">
            <h2 class="text-xl font-semibold">
              <a class="underline" :href="url">
                {{ title }}
              </a>
            </h2>
          </div>
          <Date :date="date" />
        </article>
      </li>
    </ul>
  </div>
</template>
