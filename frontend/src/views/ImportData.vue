<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-6">Import Historical Data</h1>

    <SuccessBanner v-if="showSuccess" :message="successMessage" :duration="5000" />
    <ErrorBanner v-if="error" :message="error" dismissible @dismiss="error = null" />

    <!-- File Upload Section -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
      <h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">Upload CSV File</h2>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select CSV File
        </label>
        <input
          ref="fileInput"
          type="file"
          accept=".csv"
          @change="handleFileSelect"
          class="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none"
        />
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Upload a CSV file exported from your weather station
        </p>
      </div>

      <div v-if="selectedFile" class="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ selectedFile.name }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ formatFileSize(selectedFile.size) }}</p>
          </div>
          <button
            @click="clearFile"
            class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <button
        @click="uploadFile"
        :disabled="!selectedFile || isUploading"
        class="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors"
      >
        <span v-if="isUploading" class="flex items-center justify-center gap-2">
          <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Uploading... {{ uploadProgress }}%
        </span>
        <span v-else>Upload and Import</span>
      </button>
    </div>

    <!-- Import from Server Path Section -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">Import from Server Path</h2>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          CSV File Path on Server
        </label>
        <input
          v-model="serverPath"
          type="text"
          placeholder="/path/to/file.csv"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Import a CSV file that's already on the server
        </p>
      </div>

      <button
        @click="importFromPath"
        :disabled="!serverPath || isImporting"
        class="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors"
      >
        <span v-if="isImporting" class="flex items-center justify-center gap-2">
          <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Importing...
        </span>
        <span v-else>Import from Server</span>
      </button>
    </div>

    <!-- Import History/Stats (if we want to add it later) -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ErrorBanner from '../components/ErrorBanner.vue';
import SuccessBanner from '../components/SuccessBanner.vue';

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const serverPath = ref('');
const isUploading = ref(false);
const isImporting = ref(false);
const uploadProgress = ref(0);
const error = ref<string | null>(null);
const showSuccess = ref(false);
const successMessage = ref('');

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0 && target.files[0]) {
    selectedFile.value = target.files[0];
    error.value = null;
  }
};

const clearFile = () => {
  selectedFile.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const uploadFile = async () => {
  if (!selectedFile.value) return;

  isUploading.value = true;
  uploadProgress.value = 0;
  error.value = null;

  try {
    const formData = new FormData();
    formData.append('file', selectedFile.value);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        uploadProgress.value = Math.round((e.loaded / e.total) * 100);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const result = JSON.parse(xhr.responseText);
        successMessage.value = `Successfully imported ${result.imported} readings (${result.skipped} duplicates skipped)`;
        showSuccess.value = true;
        clearFile();

        setTimeout(() => {
          showSuccess.value = false;
        }, 5000);
      } else {
        const errorData = JSON.parse(xhr.responseText);
        error.value = errorData.detail || 'Upload failed';
      }
      isUploading.value = false;
    });

    xhr.addEventListener('error', () => {
      error.value = 'Network error occurred during upload';
      isUploading.value = false;
    });

    xhr.open('POST', '/api/weather/import');
    xhr.send(formData);

  } catch (err) {
    error.value = (err as Error).message;
    isUploading.value = false;
  }
};

const importFromPath = async () => {
  if (!serverPath.value) return;

  isImporting.value = true;
  error.value = null;

  try {
    const response = await fetch('/api/weather/import/path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: serverPath.value }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Import failed');
    }

    const result = await response.json();
    successMessage.value = `Successfully imported ${result.imported} readings (${result.skipped} duplicates skipped)`;
    showSuccess.value = true;
    serverPath.value = '';

    setTimeout(() => {
      showSuccess.value = false;
    }, 5000);

  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    isImporting.value = false;
  }
};
</script>
