import { fireEvent, render } from "@testing-library/svelte";
import { expect, test, vi } from "vitest";
import FileDropzone from "./FileDropzone.svelte";

test("selects accepted files and reports invalid files", async () => {
  const drop = vi.fn();
  const view = render(FileDropzone, { accept: ".ledger" });
  view.component.$on("drop", drop);
  const input = view.container.querySelector("input") as HTMLInputElement;
  const valid = new File(["ok"], "main.ledger");
  const invalid = new File(["no"], "main.txt");

  await fireEvent.change(input, { target: { files: [valid, invalid] } });

  expect(drop).toHaveBeenCalledOnce();
  expect(drop.mock.calls[0][0].detail).toEqual({
    acceptedFiles: [valid],
    rejectedFiles: [invalid],
  });
});

test("supports native drag and drop", async () => {
  const drop = vi.fn();
  const view = render(FileDropzone, { accept: ".ledger" });
  view.component.$on("drop", drop);
  const button = view.container.querySelector("button") as HTMLButtonElement;
  const file = new File(["ok"], "main.ledger");

  await fireEvent.drop(button, { dataTransfer: { files: [file] } });

  expect(drop.mock.calls[0][0].detail.acceptedFiles).toEqual([file]);
});
