<script setup lang="ts">
defineProps<{ date: Date }>();
</script>

<template>
  <dl>
    <dt class="sr-only">Published on</dt>
    <dd class="text-base italic text-orange-950 opacity-90 m-0 p-0">
      <time :datetime="date.toISOString()">{{
        new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(date)
      }}</time>
    </dd>
  </dl>
</template>
./posts
