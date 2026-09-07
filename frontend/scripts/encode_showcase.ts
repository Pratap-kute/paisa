/** Optional GIF enhancement, generated exclusively from local capture PNGs. */
import { fromFileUrl } from "@std/path";
const images = fromFileUrl(
  new URL("../../docs/images/showcase/", import.meta.url),
);
const temporary = await Deno.makeTempDir({ prefix: "paisa-showcase-gif-" });
async function ffmpeg(args: string[]) {
  const result = await new Deno.Command("ffmpeg", {
    args: ["-hide_banner", "-loglevel", "error", "-y", ...args],
  }).output();
  if (!result.success) throw new Error(new TextDecoder().decode(result.stderr));
}
try {
  const names = [
    "dashboard",
    "expenses-budget",
    "investments",
    "import",
    "ledger-editor",
    "dashboard",
  ];
  for (let i = 0; i < names.length; i++) {
    await Deno.copyFile(`${images}/${names[i]}.png`, `${temporary}/${i}.png`);
  }
  await Deno.writeTextFile(
    `${temporary}/frames.txt`,
    names.map((_, i) => `file '${i}.png'\nduration 2\n`).join("") +
      "file '5.png'\n",
  );
  const input = ["-f", "concat", "-safe", "0", "-i", `${temporary}/frames.txt`];
  const scale = "fps=10,scale=1200:-1:flags=lanczos";
  await ffmpeg([
    ...input,
    "-vf",
    `${scale},palettegen=stats_mode=diff`,
    "-frames:v",
    "1",
    `${temporary}/palette.png`,
  ]);
  await ffmpeg([
    ...input,
    "-i",
    `${temporary}/palette.png`,
    "-lavfi",
    `${scale}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
    "-t",
    "12",
    "-loop",
    "0",
    `${temporary}/overview.gif`,
  ]);
  if ((await Deno.stat(`${temporary}/overview.gif`)).size > 6 * 1024 * 1024) {
    throw new Error("GIF exceeds 6 MiB; retain the standalone PNGs instead.");
  }
  await Deno.copyFile(
    `${temporary}/overview.gif`,
    `${images}/paisa-overview.gif`,
  );
  console.log(
    "Created 12-second overview GIF from six 2-second local screen captures.",
  );
} finally {
  await Deno.remove(temporary, { recursive: true });
}
