export interface Directory<T = unknown> {
  name: string;
  path: string;
  type: "directory";
  children: Array<Directory<T> | T>;
}

export function buildDirectoryTree<T extends { name: string; path?: string }>(
  files: T[],
): Array<Directory<T> | T> {
  const root: Array<Directory<T> | T> = [];

  for (const file of files) {
    const parts = file.name.split("/").filter(Boolean);
    let currentLevel = root;
    let currentPath = "";

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      let dir = currentLevel.find(
        (item): item is Directory<T> =>
          (item as Directory<T>).type === "directory" && (item as Directory<T>).name === part,
      );

      if (!dir) {
        dir = {
          name: part,
          path: currentPath,
          type: "directory",
          children: [],
        };
        currentLevel.push(dir);
      }

      currentLevel = dir.children;
    }

    currentLevel.push(file);
  }

  return root;
}

export interface TreeNode<T> {
  name?: string;
  item?: T;
  children: TreeNode<T>[];
}

export function buildTree<T>(
  items: T[],
  groupFn: (item: T) => string[],
): TreeNode<T>[] {
  const root: TreeNode<T> = { children: [] };

  for (const item of items) {
    const groups = groupFn(item);
    let current = root;

    for (const group of groups) {
      let child = current.children.find((c) => c.name === group);
      if (!child) {
        child = { name: group, children: [] };
        current.children.push(child);
      }
      current = child;
    }
    current.item = item;
  }

  return root.children;
}
