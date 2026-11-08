// `bun test` runs without the Svelte compiler, so modules that use runes
// (`*.svelte.ts`) would fail on `$state`. Compile them for the server, where
// runes are plain values, which is all the unit tests need.
import { plugin } from "bun";
import { compileModule } from "svelte/compiler";

const transpiler = new Bun.Transpiler({ loader: "ts" });

plugin({
  name: "svelte-runes",
  setup(build) {
    build.onLoad({ filter: /\.svelte\.ts$/ }, async ({ path }) => {
      const source = transpiler.transformSync(await Bun.file(path).text());
      const { js } = compileModule(source, {
        filename: path,
        generate: "server",
      });
      return { contents: js.code, loader: "js" };
    });
  },
});
