<script setup lang="ts">
const props = defineProps<{
  src: string;
  title?: string;
  caption?: string;
  height: number | string;
}>();
</script>

<template>
  <figure>
    <iframe
      :src="props.src"
      width="100%"
      :height="props.height"
      style="border: 0; background: white; border-radius: 2px;"
      loading="lazy"
      :title="props.title"
    ></iframe>
    <figcaption v-if="props.caption">
      <p>{{ props.caption }}</p>
    </figcaption>
  </figure>
</template>
