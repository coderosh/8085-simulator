import { samples } from "@/lib/simulator/samples";

const databaseName = "8085-sim-workspace";
const databaseVersion = 1;
const nodeStoreName = "nodes";
const metadataStoreName = "metadata";
const activeFileMetadataKey = "activeFileId";
let bootstrapPromise: Promise<WorkspaceSnapshot> | null = null;

export type FileSystemNode =
  | {
      id: string;
      kind: "folder";
      name: string;
      sortOrder?: number;
      parentId: string | null;
      createdAt: number;
      updatedAt: number;
    }
  | {
      id: string;
      kind: "file";
      name: string;
      sortOrder?: number;
      parentId: string | null;
      content: string;
      createdAt: number;
      updatedAt: number;
    };

type MetadataRecord = {
  key: string;
  value: string | null;
};

export type WorkspaceSnapshot = {
  activeFileId: string | null;
  nodes: FileSystemNode[];
};

export type CreateNodeResult = WorkspaceSnapshot & {
  createdNode: FileSystemNode;
};

export type CreateNodeInput = {
  content?: string;
  kind: FileSystemNode["kind"];
  name: string;
  parentId: string | null;
};

export async function bootstrapWorkspace(
  seedSource = samples[0].source,
): Promise<WorkspaceSnapshot> {
  bootstrapPromise ??= runBootstrapWorkspace(seedSource).finally(() => {
    bootstrapPromise = null;
  });

  return bootstrapPromise;
}

async function runBootstrapWorkspace(
  seedSource: string,
): Promise<WorkspaceSnapshot> {
  const db = await openDatabase();

  try {
    const nodes = await getAllNodes(db);

    if (nodes.length > 0) {
      const normalizedSnapshot = await normalizeSeededMainFile(db, nodes);

      if (normalizedSnapshot) {
        return normalizedSnapshot;
      }

      return {
        activeFileId: await getActiveFileId(db, nodes),
        nodes,
      };
    }

    const now = Date.now();
    const mainFile: FileSystemNode = {
      id: createId(),
      kind: "file",
      name: "main.asm",
      sortOrder: 0,
      parentId: null,
      content: seedSource,
      createdAt: now,
      updatedAt: now,
    };

    await writeTransaction(db, [nodeStoreName, metadataStoreName], (transaction) => {
      transaction.objectStore(nodeStoreName).put(mainFile);
      transaction.objectStore(metadataStoreName).put({
        key: activeFileMetadataKey,
        value: mainFile.id,
      } satisfies MetadataRecord);
    });

    return {
      activeFileId: mainFile.id,
      nodes: [mainFile],
    };
  } finally {
    db.close();
  }
}

export async function createFileSystemNode(
  input: CreateNodeInput,
): Promise<CreateNodeResult> {
  const db = await openDatabase();

  try {
    const nodes = await getAllNodes(db);
    const now = Date.now();
    const name = getUniqueSiblingName(nodes, input.parentId, input.name);
    const sortOrder = getNextSortOrder(nodes, input.parentId, input.kind);
    const node: FileSystemNode =
      input.kind === "file"
        ? {
            id: createId(),
            kind: "file",
            name,
            sortOrder,
            parentId: input.parentId,
            content: input.content ?? "",
            createdAt: now,
            updatedAt: now,
          }
        : {
            id: createId(),
            kind: "folder",
            name,
            sortOrder,
            parentId: input.parentId,
            createdAt: now,
            updatedAt: now,
          };

    await writeTransaction(db, [nodeStoreName, metadataStoreName], (transaction) => {
      transaction.objectStore(nodeStoreName).put(node);

      if (node.kind === "file") {
        transaction.objectStore(metadataStoreName).put({
          key: activeFileMetadataKey,
          value: node.id,
        } satisfies MetadataRecord);
      }
    });

    const nextNodes = [...nodes, node];

    return {
      activeFileId: node.kind === "file" ? node.id : await getActiveFileId(db, nextNodes),
      createdNode: node,
      nodes: nextNodes,
    };
  } finally {
    db.close();
  }
}

export async function deleteFileSystemNode(
  id: string,
): Promise<WorkspaceSnapshot> {
  const db = await openDatabase();

  try {
    const nodes = await getAllNodes(db);
    const deleteIds = new Set([id, ...getDescendantIds(nodes, id)]);
    const nextNodes = nodes.filter((node) => !deleteIds.has(node.id));
    const previousActiveFileId = await getActiveFileId(db, nodes);
    const activeFileWasDeleted =
      previousActiveFileId !== null && deleteIds.has(previousActiveFileId);
    const nextActiveFileId = activeFileWasDeleted
      ? findFirstFile(nextNodes)?.id ?? null
      : previousActiveFileId;

    await writeTransaction(db, [nodeStoreName, metadataStoreName], (transaction) => {
      const nodeStore = transaction.objectStore(nodeStoreName);

      for (const deleteId of deleteIds) {
        nodeStore.delete(deleteId);
      }

      transaction.objectStore(metadataStoreName).put({
        key: activeFileMetadataKey,
        value: nextActiveFileId,
      } satisfies MetadataRecord);
    });

    return {
      activeFileId: nextActiveFileId,
      nodes: nextNodes,
    };
  } finally {
    db.close();
  }
}

export async function renameFileSystemNode(
  id: string,
  name: string,
): Promise<WorkspaceSnapshot> {
  const db = await openDatabase();

  try {
    const nodes = await getAllNodes(db);
    const node = nodes.find((candidate) => candidate.id === id);

    if (!node) {
      return {
        activeFileId: await getActiveFileId(db, nodes),
        nodes,
      };
    }

    const nextNode = {
      ...node,
      name: getUniqueSiblingName(
        nodes.filter((candidate) => candidate.id !== id),
        node.parentId,
        name,
      ),
      updatedAt: Date.now(),
    } satisfies FileSystemNode;

    await putNode(db, nextNode);

    return {
      activeFileId: await getActiveFileId(db, nodes),
      nodes: nodes.map((candidate) =>
        candidate.id === id ? nextNode : candidate,
      ),
    };
  } finally {
    db.close();
  }
}

export async function reorderFileSystemNode(
  draggedId: string,
  targetId: string,
): Promise<WorkspaceSnapshot> {
  const db = await openDatabase();

  try {
    const nodes = await getAllNodes(db);
    const draggedNode = nodes.find((node) => node.id === draggedId);
    const targetNode = nodes.find((node) => node.id === targetId);

    if (
      !draggedNode ||
      !targetNode ||
      draggedNode.id === targetNode.id ||
      isDescendantOf(nodes, targetNode.id, draggedNode.id)
    ) {
      return {
        activeFileId: await getActiveFileId(db, nodes),
        nodes,
      };
    }

    if (targetNode.kind === "folder") {
      const nextParentId = targetNode.id;
      const nextNode = {
        ...draggedNode,
        name: getUniqueSiblingName(
          nodes.filter((node) => node.id !== draggedNode.id),
          nextParentId,
          draggedNode.name,
        ),
        parentId: nextParentId,
        sortOrder: getNextSortOrder(nodes, nextParentId, draggedNode.kind),
        updatedAt: Date.now(),
      } satisfies FileSystemNode;
      const nextNodes = nodes.map((node) =>
        node.id === draggedNode.id ? nextNode : node,
      );

      await putNode(db, nextNode);

      return {
        activeFileId: await getActiveFileId(db, nextNodes),
        nodes: nextNodes,
      };
    }

    if (
      draggedNode.kind !== targetNode.kind ||
      draggedNode.parentId !== targetNode.parentId
    ) {
      return {
        activeFileId: await getActiveFileId(db, nodes),
        nodes,
      };
    }

    const siblings = getSortedFileSystemNodes(
      nodes.filter(
        (node) =>
          node.parentId === draggedNode.parentId && node.kind === draggedNode.kind,
      ),
    );
    const withoutDragged = siblings.filter((node) => node.id !== draggedNode.id);
    const targetIndex = withoutDragged.findIndex((node) => node.id === targetNode.id);
    const reorderedSiblings = [
      ...withoutDragged.slice(0, targetIndex),
      draggedNode,
      ...withoutDragged.slice(targetIndex),
    ].map((node, index) => ({
      ...node,
      sortOrder: index,
      updatedAt: Date.now(),
    }) satisfies FileSystemNode);
    const reorderedById = new Map(
      reorderedSiblings.map((node) => [node.id, node] as const),
    );
    const nextNodes = nodes.map((node) => reorderedById.get(node.id) ?? node);

    await writeTransaction(db, [nodeStoreName], (transaction) => {
      const nodeStore = transaction.objectStore(nodeStoreName);

      for (const node of reorderedSiblings) {
        nodeStore.put(node);
      }
    });

    return {
      activeFileId: await getActiveFileId(db, nextNodes),
      nodes: nextNodes,
    };
  } finally {
    db.close();
  }
}

export async function moveFileSystemNodeToRoot(
  draggedId: string,
): Promise<WorkspaceSnapshot> {
  const db = await openDatabase();

  try {
    const nodes = await getAllNodes(db);
    const draggedNode = nodes.find((node) => node.id === draggedId);

    if (!draggedNode || draggedNode.parentId === null) {
      return {
        activeFileId: await getActiveFileId(db, nodes),
        nodes,
      };
    }

    const nextNode = {
      ...draggedNode,
      name: getUniqueSiblingName(
        nodes.filter((node) => node.id !== draggedNode.id),
        null,
        draggedNode.name,
      ),
      parentId: null,
      sortOrder: getNextSortOrder(nodes, null, draggedNode.kind),
      updatedAt: Date.now(),
    } satisfies FileSystemNode;
    const nextNodes = nodes.map((node) =>
      node.id === draggedNode.id ? nextNode : node,
    );

    await putNode(db, nextNode);

    return {
      activeFileId: await getActiveFileId(db, nextNodes),
      nodes: nextNodes,
    };
  } finally {
    db.close();
  }
}

export async function setActiveFileSystemFile(
  id: string | null,
): Promise<WorkspaceSnapshot> {
  const db = await openDatabase();

  try {
    await putMetadata(db, activeFileMetadataKey, id);

    return {
      activeFileId: id,
      nodes: await getAllNodes(db),
    };
  } finally {
    db.close();
  }
}

export async function updateFileSystemFileContent(
  id: string,
  content: string,
): Promise<FileSystemNode | null> {
  const db = await openDatabase();

  try {
    const nodes = await getAllNodes(db);
    const node = nodes.find(
      (candidate): candidate is Extract<FileSystemNode, { kind: "file" }> =>
        candidate.id === id && candidate.kind === "file",
    );

    if (!node || node.content === content) {
      return node ?? null;
    }

    const nextNode = {
      ...node,
      content,
      updatedAt: Date.now(),
    } satisfies FileSystemNode;

    await putNode(db, nextNode);

    return nextNode;
  } finally {
    db.close();
  }
}

export function getSortedFileSystemNodes(nodes: FileSystemNode[]) {
  return [...nodes].sort((a, b) => {
    if (a.parentId !== b.parentId) {
      return (a.parentId ?? "").localeCompare(b.parentId ?? "");
    }

    if (a.kind !== b.kind) {
      return a.kind === "folder" ? -1 : 1;
    }

    if (a.sortOrder !== undefined || b.sortOrder !== undefined) {
      return (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER);
    }

    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export function getFileSystemDescendantIds(
  nodes: FileSystemNode[],
  id: string,
) {
  return getDescendantIds(nodes, id);
}

export function getUniqueFileSystemNodeName(
  nodes: FileSystemNode[],
  parentId: string | null,
  name: string,
) {
  return getUniqueSiblingName(nodes, parentId, name);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(nodeStoreName)) {
        const nodeStore = db.createObjectStore(nodeStoreName, { keyPath: "id" });
        nodeStore.createIndex("parentId", "parentId");
      }

      if (!db.objectStoreNames.contains(metadataStoreName)) {
        db.createObjectStore(metadataStoreName, { keyPath: "key" });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getAllNodes(db: IDBDatabase): Promise<FileSystemNode[]> {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(nodeStoreName, "readonly")
      .objectStore(nodeStoreName)
      .getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as FileSystemNode[]);
  });
}

function getActiveFileId(
  db: IDBDatabase,
  nodes: FileSystemNode[],
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(metadataStoreName, "readonly")
      .objectStore(metadataStoreName)
      .get(activeFileMetadataKey);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const record = request.result as MetadataRecord | undefined;
      const fileId =
        record?.value && nodes.some((node) => node.id === record.value)
          ? record.value
          : findFirstFile(nodes)?.id ?? null;

      resolve(fileId);
    };
  });
}

function putNode(db: IDBDatabase, node: FileSystemNode): Promise<void> {
  return writeTransaction(db, [nodeStoreName], (transaction) => {
    transaction.objectStore(nodeStoreName).put(node);
  });
}

function putMetadata(
  db: IDBDatabase,
  key: string,
  value: string | null,
): Promise<void> {
  return writeTransaction(db, [metadataStoreName], (transaction) => {
    transaction.objectStore(metadataStoreName).put({ key, value });
  });
}

async function normalizeSeededMainFile(
  db: IDBDatabase,
  nodes: FileSystemNode[],
): Promise<WorkspaceSnapshot | null> {
  const duplicateMainFiles = nodes.filter(
    (node) =>
      node.kind === "file" &&
      node.parentId === null &&
      node.name.toLocaleLowerCase() === "main.asm",
  );

  if (duplicateMainFiles.length <= 1) {
    return null;
  }

  const activeFileId = await getActiveFileId(db, nodes);
  const activeDuplicate =
    duplicateMainFiles.find((node) => node.id === activeFileId) ??
    duplicateMainFiles[0];
  const deleteIds = new Set(
    duplicateMainFiles
      .filter((node) => node.id !== activeDuplicate.id)
      .map((node) => node.id),
  );
  const nextNodes = nodes.filter((node) => !deleteIds.has(node.id));

  await writeTransaction(db, [nodeStoreName, metadataStoreName], (transaction) => {
    const nodeStore = transaction.objectStore(nodeStoreName);

    for (const deleteId of deleteIds) {
      nodeStore.delete(deleteId);
    }

    transaction.objectStore(metadataStoreName).put({
      key: activeFileMetadataKey,
      value: activeDuplicate.id,
    } satisfies MetadataRecord);
  });

  return {
    activeFileId: activeDuplicate.id,
    nodes: nextNodes,
  };
}

function writeTransaction(
  db: IDBDatabase,
  storeNames: string[],
  run: (transaction: IDBTransaction) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, "readwrite");

    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();

    run(transaction);
  });
}

function findFirstFile(nodes: FileSystemNode[]) {
  return getSortedFileSystemNodes(nodes).find((node) => node.kind === "file") as
    | Extract<FileSystemNode, { kind: "file" }>
    | undefined;
}

function getDescendantIds(nodes: FileSystemNode[], id: string): string[] {
  const childIds = nodes
    .filter((node) => node.parentId === id)
    .map((node) => node.id);

  return childIds.flatMap((childId) => [
    childId,
    ...getDescendantIds(nodes, childId),
  ]);
}

function isDescendantOf(
  nodes: FileSystemNode[],
  candidateId: string,
  ancestorId: string,
) {
  let parentId = nodes.find((node) => node.id === candidateId)?.parentId ?? null;

  while (parentId) {
    if (parentId === ancestorId) return true;
    parentId = nodes.find((node) => node.id === parentId)?.parentId ?? null;
  }

  return false;
}

function getUniqueSiblingName(
  nodes: FileSystemNode[],
  parentId: string | null,
  name: string,
) {
  const trimmedName = name.trim() || "untitled.asm";
  const siblingNames = new Set(
    nodes
      .filter((node) => node.parentId === parentId)
      .map((node) => node.name.toLocaleLowerCase()),
  );

  if (!siblingNames.has(trimmedName.toLocaleLowerCase())) {
    return trimmedName;
  }

  const extensionIndex = trimmedName.lastIndexOf(".");
  const hasExtension = extensionIndex > 0;
  const baseName = hasExtension ? trimmedName.slice(0, extensionIndex) : trimmedName;
  const extension = hasExtension ? trimmedName.slice(extensionIndex) : "";
  let suffix = 1;

  while (siblingNames.has(`${baseName}-${suffix}${extension}`.toLocaleLowerCase())) {
    suffix++;
  }

  return `${baseName}-${suffix}${extension}`;
}

function getNextSortOrder(
  nodes: FileSystemNode[],
  parentId: string | null,
  kind: FileSystemNode["kind"],
) {
  const siblingOrders = nodes
    .filter((node) => node.parentId === parentId && node.kind === kind)
    .map((node) => node.sortOrder)
    .filter((sortOrder): sortOrder is number => sortOrder !== undefined);

  return siblingOrders.length === 0 ? 0 : Math.max(...siblingOrders) + 1;
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-${Math.random()}`;
}
