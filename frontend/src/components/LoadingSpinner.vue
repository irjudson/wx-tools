<template>
  <div class="flex flex-col items-center justify-center py-6">
    <div
      :class="spinnerSizeClass"
      class="animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
    ></div>
    <p v-if="message" class="mt-4 text-gray-700 dark:text-gray-300">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  message: '',
});

const spinnerSizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-6 w-6';
    case 'lg':
      return 'h-16 w-16';
    default:
      return 'h-12 w-12';
  }
});
</script>
