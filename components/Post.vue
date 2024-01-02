<script setup lang="ts">
import DateComponent from "../.vitepress/theme/Date.vue";
import type { Post } from "./types.ts";

defineProps<{
  post: Post;
}>();
</script>

<template>
  <article class="">
    <div class="text-lg font-medium">
      <a class="" :href="post.url">
        {{ post.title }}
      </a>
    </div>
    <DateComponent :date="new Date(post.date.time)" />
  </article>
</template>
