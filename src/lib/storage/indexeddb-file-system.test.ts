import { describe, expect, it } from "vitest";

import {
  getFileSystemDescendantIds,
  getSortedFileSystemNodes,
  getUniqueFileSystemNodeName,
  type FileSystemNode,
} from "./indexeddb-file-system";

const now = 1;

describe("IndexedDB file system helpers", () => {
  it("sorts folders before files at the same level", () => {
    const nodes = [
      file("z-file", "z.asm", null),
      folder("b-folder", "Beta", null),
      file("a-file", "a.asm", null),
      folder("a-folder", "Alpha", null),
    ];

    expect(getSortedFileSystemNodes(nodes).map((node) => node.name)).toEqual([
      "Alpha",
      "Beta",
      "a.asm",
      "z.asm",
    ]);
  });

  it("generates duplicate-safe sibling names while preserving extensions", () => {
    const nodes = [
      file("main", "main.asm", null),
      file("main-1", "main-1.asm", null),
      folder("nested", "main.asm", "folder"),
    ];

    expect(getUniqueFileSystemNodeName(nodes, null, "main.asm")).toBe(
      "main-2.asm",
    );
    expect(getUniqueFileSystemNodeName(nodes, "folder", "main.asm")).toBe(
      "main-1.asm",
    );
  });

  it("finds nested descendants for recursive folder deletion", () => {
    const nodes = [
      folder("src", "src", null),
      folder("examples", "examples", "src"),
      file("main", "main.asm", "src"),
      file("demo", "demo.asm", "examples"),
      file("readme", "readme.asm", null),
    ];

    expect(getFileSystemDescendantIds(nodes, "src").sort()).toEqual([
      "demo",
      "examples",
      "main",
    ]);
  });
});

function file(
  id: string,
  name: string,
  parentId: string | null,
): FileSystemNode {
  return {
    id,
    kind: "file",
    name,
    parentId,
    content: "",
    createdAt: now,
    updatedAt: now,
  };
}

function folder(
  id: string,
  name: string,
  parentId: string | null,
): FileSystemNode {
  return {
    id,
    kind: "folder",
    name,
    parentId,
    createdAt: now,
    updatedAt: now,
  };
}
