<script setup lang="ts">
const props = defineProps<{
  src: string;
  title: string;
}>();
</script>

<template>
  <video autoplay controls loop :title="props.title" preload="auto">
    <source :src="props.src" />
  </video>
</template>
