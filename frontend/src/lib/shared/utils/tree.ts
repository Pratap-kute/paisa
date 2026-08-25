import { dropRight } from "es-toolkit";
import type { Directory } from "$lib/domain/ledger";
import { sortBy } from "$lib/shared/utils/collection";

interface NamedFile {
  type: "file";
  name: string;
  content: string;
  versions: string[];
}

export function buildDirectoryTree<T extends NamedFile>(files: T[]) {
  const root: Directory = {
    type: "directory",
    name: "",
    children: [],
  };

  for (const file of sortBy(files, (f) => f.name)) {
    const parts = file.name.split("/");
    let current = root;
    for (const part of dropRight(parts, 1)) {
      let found = current.children.find((c) => c.name === part);
      if (!found) {
        found = {
          type: "directory",
          name: part,
          children: [],
        };
        current.children.push(found);
      }
      current = found as Directory;
    }
    current.children.push(file);
  }

  return root.children;
}

export function buildTree<I extends object>(
  items: I[],
  accountAccessor: (item: I) => string,
): I[] {
  const result: I[] = [];

  const sorted = sortBy(items, accountAccessor);

  for (const item of sorted) {
    const account = accountAccessor(item);
    const parts = account.split(":");
    let current = result;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      // deno-lint-ignore no-explicit-any -- Generic tree nodes gain a recursive UI-only child collection.
      let found: any = current.find((c) =>
        accountAccessor(c).split(":")[i] === part
      );
      if (!found) {
        found = { ...item };
        current.push(found);
      }

      if (i !== parts.length - 1) {
        found._children = found._children || [];
        current = found._children;
      }
    }
  }

  return result;
}
