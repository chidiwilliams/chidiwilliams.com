<script setup lang="ts">
import { useData } from "vitepress";
import Article from "./Article.vue";
import NotFound from "./NotFound.vue";

const { page, frontmatter, site } = useData();
</script>

<template>
  <div class="font-serif">
    <div v-if="frontmatter.layout === 'page'">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 xl:max-w-5xl xl:px-0 pb-12">
        <div class="py-10 space-y-16">
          <header class="space-y-2 sm:space-y-4">
            <h1
              class="lg:pt-32 text-2xl leading-9 font-extrabold sm:text-3xl sm:leading-10 md:text-5xl md:leading-14 italic lowercase"
            >
              {{ frontmatter.title }}
            </h1>

            <nav>
              <ul class="flex gap-6 text-sm font-sans">
                <li v-if="page.relativePath !== 'index.md'">
                  <a
                    href="/"
                    class="transition transition-all opacity-80 hover:opacity-100"
                    >← Home</a
                  >
                </li>
                <template v-for="{ text, link } of site.themeConfig.nav">
                  <li v-if="text !== frontmatter.title">
                    <a
                      :href="link"
                      class="transition transition-all opacity-80 hover:opacity-100"
                      >{{ text }}</a
                    >
                  </li>
                </template>
              </ul>
            </nav>
          </header>

          <Content />
        </div>
      </div>
    </div>
    <NotFound v-else-if="page.isNotFound" />
    <Article v-else />
  </div>
</template>
