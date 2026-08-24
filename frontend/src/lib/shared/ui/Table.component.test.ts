import { render, waitFor } from "@testing-library/svelte";
import { expect, test, vi } from "vitest";

vi.mock("tabulator-tables", () => {
  const instances: { data: unknown[] }[] = [];
  class TabulatorFull {
    data: unknown[];
    constructor(_el: unknown, options: { data?: unknown[] }) {
      this.data = options.data ?? [];
      instances.push(this);
    }
    on(event: string, cb: () => void) {
      if (event === "tableBuilt") {
        queueMicrotask(cb);
      }
    }
    setData(data: unknown[]) {
      this.data = data;
    }
    destroy() {}
  }
  return { TabulatorFull, instances };
});

import { instances } from "tabulator-tables";
import Table from "./Table.svelte";

test("replaces table data when going populated → empty → populated", async () => {
  instances.length = 0;
  const columns = [{ title: "Name", field: "name" }];
  const populated = [{ name: "alpha" }, { name: "beta" }];

  const { rerender, unmount } = render(Table, {
    data: populated,
    columns,
  });

  await waitFor(() => expect(instances.length).toBe(1));
  await waitFor(() => expect(instances[0].data).toEqual(populated));

  await rerender({ data: [], columns });
  await waitFor(() => expect(instances[0].data).toEqual([]));

  const next = [{ name: "gamma" }];
  await rerender({ data: next, columns });
  await waitFor(() => expect(instances[0].data).toEqual(next));

  unmount();
});
