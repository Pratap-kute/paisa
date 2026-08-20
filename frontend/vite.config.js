import { fileURLToPath } from "node:url";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const apiProxy = {
  "/api": {
    target: "http://localhost:7500",
  },
};

function fixVendorEvalPlugin() {
  return {
    name: "fix-vendor-eval",
    transform(code, id) {
      if (id.includes("xlsx-populate")) {
        return code.replace(
          "return eval(this.code)",
          "return (0, eval)(this.code)",
        );
      }
    },
  };
}

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
    chunkSizeWarningLimit: 700,
  },
  plugins: [tailwindcss(), sveltekit(), fixVendorEvalPlugin()],
  server: {
    // The backend proxy is tied to this development server. Starting on an
    // arbitrary fallback port hides stale `make develop` processes and leaves
    // multiple competing app instances running.
    strictPort: true,
    forwardConsole: true,
    proxy: apiProxy,
    fs: {
      allow: ["./fonts"],
    },
  },
  preview: {
    proxy: apiProxy,
  },
});
