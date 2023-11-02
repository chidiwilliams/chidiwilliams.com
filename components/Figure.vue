<script setup lang="ts">
const props = defineProps<{
  src: string;
  alt?: string;
  caption?: string;
  link?: string;
  title?: string;
  width: number | string;
  height: number | string;
}>();
</script>

<template>
  <figure>
    <img
      :src="props.src"
      :alt="props.alt ?? props.caption"
      :width="props.width"
      :height="props.height"
      :title="props.title"
    />
    <figcaption v-if="props.caption">
      <a :href="props.link" v-if="props.link">
        {{ props.caption }}
      </a>
      <span v-else>{{ props.caption }}</span>
    </figcaption>
  </figure>
</template>
