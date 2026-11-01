/** Optional GIF enhancement, generated exclusively from local capture PNGs. */
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const images = fileURLToPath(
  new URL("../../docs/images/showcase/", import.meta.url),
);
const temporary = await fs.mkdtemp(
  path.join(os.tmpdir(), "paisa-showcase-gif-"),
);

async function ffmpeg(args: string[]) {
  const proc = Bun.spawn(
    ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", ...args],
    {
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) throw new Error(stderr);
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
    await fs.copyFile(`${images}/${names[i]}.png`, `${temporary}/${i}.png`);
  }
  await fs.writeFile(
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
  if ((await fs.stat(`${temporary}/overview.gif`)).size > 6 * 1024 * 1024) {
    throw new Error("GIF exceeds 6 MiB; retain the standalone PNGs instead.");
  }
  await fs.copyFile(
    `${temporary}/overview.gif`,
    `${images}/paisa-overview.gif`,
  );
  console.log(
    "Created 12-second overview GIF from six 2-second local screen captures.",
  );
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}
