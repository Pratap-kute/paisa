import { fileURLToPath } from "node:url";
import process from "node:process";

export const COVERAGE_THRESHOLD = 60;

export function coverageThreshold(): number {
  return process.env.COVERAGE_REPORT_ONLY === "true" ? 0 : COVERAGE_THRESHOLD;
}

export const sharedResolve = {
  alias: {
    "$app/navigation": fileURLToPath(
      new URL("./tests/setup/navigation.ts", import.meta.url),
    ),
    $lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
    xlsx: fileURLToPath(
      new URL("./src/lib/shared/vendor/xlsx.mjs", import.meta.url),
    ),
  },
};
