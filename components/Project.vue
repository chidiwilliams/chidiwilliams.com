<script setup lang="ts">
import type { Project } from "./project.ts";

defineProps<{
  project: Project;
}>();
</script>

<template>
  <article>
    <h3 class="text-lg font-medium">
      <a :href="project.link">{{ project.name }}</a>
    </h3>
    <div>{{ project.description }}</div>
    <ul class="mt-1 text-sm flex gap-4 opacity-80 font-semibold">
      <li v-for="{ name, link } of project.links">
        <a :href="link" class="">{{ name }}</a>
      </li>
    </ul>
  </article>
</template>
