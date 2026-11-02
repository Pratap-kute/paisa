import { fileURLToPath } from "node:url";
import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const apiProxy = {
  "/api": {
    target: `http://127.0.0.1:${process.env.PAISA_E2E_BACKEND_PORT ?? 7500}`,
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

function fixArimaBufferPlugin() {
  return {
    name: "fix-arima-buffer-fallback",
    transform(code, id) {
      if (id.endsWith("/arima/wrapper/native.bin.js")) {
        return code.replace(
          "require('buf' + 'fer').Buffer",
          "globalThis.Buffer",
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
        new URL("./src/lib/shared/vendor/xlsx.mjs", import.meta.url),
      ),
    },
  },
  css: {
    preprocessorOptions: {},
  },
  build: {
    target: "es2021",
  },
  plugins: [
    tailwindcss(),
    // SvelteKit 3 reads its configuration from the Vite plugin, not from
    // svelte.config.js.
    sveltekit({
      preprocess: vitePreprocess(),
      adapter: adapter({
        pages: "../backend/web/static",
        assets: "../backend/web/static",
        out: "../backend/web/static",
        fallback: "index.html",
      }),
      alias: {
        xlsx: "src/lib/shared/vendor/xlsx.mjs",
      },
    }),
    fixVendorEvalPlugin(),
    fixArimaBufferPlugin(),
  ],
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
