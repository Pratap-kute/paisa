import { fileURLToPath } from "node:url";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

const apiProxy = {
  "/api": {
    target: "http://localhost:7500",
  },
};

export default defineConfig({
  cacheDir: "node_modules/.vite",
  resolve: {
    alias: {
      xlsx: fileURLToPath(
        new URL("./src/lib/vendor/xlsx.mjs", import.meta.url),
      ),
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
  plugins: [sveltekit()],
  server: {
    // The backend proxy is tied to this development server. Starting on an
    // arbitrary fallback port hides stale `make develop` processes and leaves
    // multiple competing app instances running.
    strictPort: true,
    proxy: apiProxy,
    fs: {
      allow: ["./fonts"],
    },
  },
  preview: {
    proxy: apiProxy,
  },
});
