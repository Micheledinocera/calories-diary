<script setup lang="ts">
import { it } from "@nuxt/ui/locale";
</script>

<template>
  <!-- Italian locale: labels of the Nuxt UI components and dates of the calendar. -->
  <UApp :locale="it">
    <NuxtPwaAssets />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
