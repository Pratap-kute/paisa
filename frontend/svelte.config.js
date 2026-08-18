import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  onwarn: (warning, handler) => {
    handler(warning);
  },

  kit: {
    adapter: adapter({
      pages: "../backend/web/static",
      assets: "../backend/web/static",
      out: "../backend/web/static",
      fallback: "index.html",
    }),
  },
};

export default config;
