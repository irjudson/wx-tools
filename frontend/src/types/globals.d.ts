// frontend/src/types/globals.d.ts
// This file is used to declare global types that might not be available by default in TypeScript.

declare namespace NodeJS {
  interface Global {
    fetch: typeof fetch;
  }
}

interface Window {
  // Add any other global properties that might be accessed in the browser context if needed.
}
