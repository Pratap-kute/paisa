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
  // Pre-bundle these so Vite does not discover them mid-session, re-optimize
  // and reload the page, which fails any dynamic import still in flight.
  optimizeDeps: {
    include: [
      "dayjs/plugin/customParseFormat",
      "dayjs/plugin/isSameOrAfter",
      "dayjs/plugin/isSameOrBefore",
      "dayjs/plugin/localeData",
      "dayjs/plugin/relativeTime",
      "dayjs/plugin/timezone",
      "dayjs/plugin/updateLocale",
      "dayjs/plugin/utc",
    ],
  },
  build: {
    target: "es2021",
    rolldownOptions: {
      output: {
        // Keep each vendor chunk below Vite's 500 kB warning limit by
        // splitting the large libraries and the icon tables apart.
        codeSplitting: {
          groups: [
            { name: "zrender", test: /node_modules[\\/]zrender/, priority: 30 },
            { name: "echarts", test: /node_modules[\\/]echarts/, priority: 20 },
            {
              name: "icons-arcticons",
              test: /fonts[\\/]arcticons-info/,
              priority: 10,
            },
            { name: "icons-mdi", test: /fonts[\\/]mdi-info/, priority: 10 },
          ],
        },
      },
    },
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
