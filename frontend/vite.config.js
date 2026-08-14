import { sveltekit } from "@sveltejs/kit/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

/** @type {import('vite').UserConfig} */
const config = {
  cacheDir: "node_modules/.vite",
  resolve: {
    alias: {
      xlsx: new URL("./src/lib/vendor/xlsx.mjs", import.meta.url).pathname,
    },
  },
  css: {
    preprocessorOptions: {
      sass: {
        api: "modern-compiler",
      },
      scss: {
        api: "modern-compiler",
      },
    },
  },
  build: {
    target: "es2021",
    // The largest chunk is the lazy-loaded encrypted-XLSX fallback and
    // compresses to roughly 210 KiB. Keep warning on material growth.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      onwarn(warning, warn) {
        // These legacy browser libraries intentionally use eval in isolated
        // compatibility shims. Neither source is maintained in this project.
        if (
          warning.code === "EVAL" &&
          (warning.id?.includes("pdfjs-dist") ||
            warning.id?.includes("xlsx-populate"))
        ) {
          return;
        }
        warn(warning);
      },
    },
  },
  plugins: [
    sveltekit(),
    // xlsx-populate uses Buffer when the lazy-loaded import route is opened.
    nodePolyfills({ include: ["buffer"], globals: { Buffer: true } }),
  ],
  server: {
    // The backend proxy is tied to this development server. Starting on an
    // arbitrary fallback port hides stale `make develop` processes and leaves
    // multiple competing app instances running.
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:7500",
      },
    },
    fs: {
      allow: ["./fonts"],
    },
  },
  preview: {
    proxy: {
      "/api": {
        target: "http://localhost:7500",
      },
    },
  },
};

export default config;
