<script setup lang="ts">
import type { Post } from "./posts.data";

const props = defineProps<{ date: Post["date"] }>();

function getDateTime() {
  return new Date(props.date.time).toISOString();
}
</script>

<template>
  <dl>
    <dt class="sr-only">Published on</dt>
    <dd class="text-base italic text-orange-950 opacity-90 m-0 p-0">
      <time :datetime="getDateTime()">{{ date.string }}</time>
    </dd>
  </dl>
</template>
