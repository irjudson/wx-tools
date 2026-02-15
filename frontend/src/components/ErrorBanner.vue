<template>
  <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <p class="font-bold">Error</p>
        <p class="text-sm">{{ message }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="onRetry"
          @click="onRetry"
          class="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-sm"
        >
          Retry
        </button>
        <button
          v-if="dismissible"
          @click="emit('dismiss')"
          class="text-red-700 hover:text-red-900"
          aria-label="Dismiss"
        >
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  message: string;
  onRetry?: () => void;
  dismissible?: boolean;
}

withDefaults(defineProps<Props>(), {
  dismissible: true,
});

const emit = defineEmits<{
  dismiss: [];
}>();
</script>
