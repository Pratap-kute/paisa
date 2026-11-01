import "./setup.ts";
import dayjs from "dayjs";
import { afterEach, beforeEach, vi } from "vitest";
import { setNow } from "$lib/domain/time";

beforeEach(() => {
  setNow(dayjs());
});

afterEach(() => {
  vi.unstubAllGlobals();
});
