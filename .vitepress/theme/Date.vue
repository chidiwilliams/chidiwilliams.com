<script setup lang="ts">
import type { Post } from './posts.data';

const props = defineProps<{ date: Post['date'] }>();

function getDateTime() {
  return new Date(props.date.time).toISOString();
}
</script>

<template>
  <dl>
    <dt class="sr-only">Published on</dt>
    <dd class="text-base text-orange-950 opacity-80">
      <time :datetime="getDateTime()">{{ date.string }}</time>
    </dd>
  </dl>
</template>
