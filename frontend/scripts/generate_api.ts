import { generateApi } from "swagger-typescript-api";
import path from "node:path";
import fs from "node:fs";

const isCheck = Deno.args.includes("--check");
const swaggerPath = path.resolve("../backend/docs/swagger.json");
const outputDir = path.resolve("./src/lib/api/generated");
const targetFile = path.join(outputDir, "Api.ts");

if (!fs.existsSync(swaggerPath)) {
  console.error(`Swagger spec not found at: ${swaggerPath}`);
  console.error("Please run 'make swagger' first.");
  Deno.exit(1);
}

if (isCheck) {
  const tempDir = Deno.makeTempDirSync();
  try {
    await generateApi({
      input: swaggerPath,
      output: tempDir,
      fileName: "Api.ts",
      httpClientType: "fetch",
      singleHttpClient: true,
      unwrapResponseData: true,
    });

    const tempFile = path.join(tempDir, "Api.ts");
    // Format temporary file using deno fmt
    const fmtCmd = new Deno.Command("deno", {
      args: ["fmt", tempFile],
      stdout: "null",
      stderr: "null",
    });
    await fmtCmd.output();

    if (!fs.existsSync(targetFile)) {
      console.error(
        "Error: Generated API client does not exist at: " + targetFile,
      );
      console.error("Run 'deno task api:generate' to generate it.");
      Deno.exit(1);
    }

    const currentContent = fs.readFileSync(targetFile, "utf-8");
    const newContent = fs.readFileSync(tempFile, "utf-8");

    if (currentContent !== newContent) {
      console.error(
        "Error: Generated API client is out of date with backend Swagger specification.",
      );
      console.error("Please run: deno task api:generate");
      Deno.exit(1);
    }

    console.log("✔ Generated API client is up to date.");
  } finally {
    try {
      Deno.removeSync(tempDir, { recursive: true });
    } catch {
      // ignore cleanup error
    }
  }
} else {
  fs.mkdirSync(outputDir, { recursive: true });
  await generateApi({
    input: swaggerPath,
    output: outputDir,
    fileName: "Api.ts",
    httpClientType: "fetch",
    singleHttpClient: true,
    unwrapResponseData: true,
  });

  const fmtCmd = new Deno.Command("deno", {
    args: ["fmt", targetFile],
    stdout: "inherit",
    stderr: "inherit",
  });
  await fmtCmd.output();

  console.log("✔ API client generated successfully in: " + targetFile);
}
