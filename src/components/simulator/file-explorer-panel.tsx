import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  FolderOpen,
  MoreHorizontal,
  PanelLeftClose,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useSimulatorStore } from "@/stores";

import type { FileSystemNode } from "@/lib/storage/indexeddb-file-system";

export const FileExplorerPanel = memo(function FileExplorerPanel() {
  const activeFileId = useSimulatorStore((state) => state.activeFileId);
  const createFile = useSimulatorStore((state) => state.createFile);
  const createFolder = useSimulatorStore((state) => state.createFolder);
  const deleteNode = useSimulatorStore((state) => state.deleteNode);
  const expandedFolderIds = useSimulatorStore(
    (state) => state.expandedFolderIds,
  );
  const nodes = useSimulatorStore((state) => state.fileSystemNodes);
  const moveNodeToRoot = useSimulatorStore((state) => state.moveNodeToRoot);
  const renameNode = useSimulatorStore((state) => state.renameNode);
  const reorderNode = useSimulatorStore((state) => state.reorderNode);
  const selectFile = useSimulatorStore((state) => state.selectFile);
  const setFileExplorerCollapsed = useSimulatorStore(
    (state) => state.setFileExplorerCollapsed,
  );
  const toggleFolder = useSimulatorStore((state) => state.toggleFolder);
  const workspaceError = useSimulatorStore((state) => state.workspaceError);
  const workspaceSaveStatus = useSimulatorStore(
    (state) => state.workspaceSaveStatus,
  );
  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dropTargetNodeId, setDropTargetNodeId] = useState<string | null>(null);
  const [isRootDropTarget, setIsRootDropTarget] = useState(false);
  const childMap = useMemo(() => buildChildMap(nodes), [nodes]);
  const nodeMap = useMemo(
    () => new Map(nodes.map((node) => [node.id, node] as const)),
    [nodes],
  );
  const rootNodes = childMap.get("root") ?? [];
  const saveLabel = getSaveLabel(workspaceSaveStatus);
  const createRootFile = useCallback(
    () =>
      void createFile(null).then((createdNodeId) => {
        setRenamingNodeId(createdNodeId);
      }),
    [createFile],
  );
  const createRootFolder = useCallback(
    () =>
      void createFolder(null).then((createdNodeId) => {
        setRenamingNodeId(createdNodeId);
      }),
    [createFolder],
  );
  const canDropOnRoot = useCallback(
    (draggedId: string | null) => {
      if (!draggedId) return false;

      return nodeMap.get(draggedId)?.parentId !== null;
    },
    [nodeMap],
  );
  return (
    <aside className="flex h-full min-h-0 flex-col border-b bg-sidebar text-sidebar-foreground md:border-b-0 md:border-r">
      <div className="flex min-h-13 items-center justify-between gap-2 px-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Files</div>
          <div className="truncate text-xs text-muted-foreground">
            {saveLabel}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon-xs"
            variant="ghost"
            title="New file"
            onClick={createRootFile}
          >
            <FileCode2 />
            <span className="sr-only">New file</span>
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            title="New folder"
            onClick={createRootFolder}
          >
            <Folder />
            <span className="sr-only">New folder</span>
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            title="Collapse file explorer"
            onClick={() => setFileExplorerCollapsed(true)}
          >
            <PanelLeftClose />
            <span className="sr-only">Collapse file explorer</span>
          </Button>
        </div>
      </div>
      <Separator />

      <ContextMenu>
        <ContextMenuTrigger className="min-h-0 flex-1">
          <ScrollArea className="size-full">
            <div
              className={cn(
                "flex min-h-full flex-col gap-0.5 rounded-2xl p-2",
                isRootDropTarget && "ring-2 ring-primary/55",
              )}
              onDragLeave={(event) => {
                if (event.currentTarget === event.target) {
                  setIsRootDropTarget(false);
                }
              }}
              onDragOver={(event) => {
                if (!canDropOnRoot(draggingNodeId)) return;

                event.preventDefault();
                setIsRootDropTarget(true);
              }}
              onDrop={(event) => {
                event.preventDefault();

                const draggedId =
                  event.dataTransfer.getData("text/plain") || draggingNodeId;

                if (draggedId && canDropOnRoot(draggedId)) {
                  void moveNodeToRoot(draggedId);
                }

                setDraggingNodeId(null);
                setDropTargetNodeId(null);
                setIsRootDropTarget(false);
              }}
            >
              {rootNodes.length === 0 ? (
                <div className="rounded-2xl border border-dashed px-3 py-5 text-center text-sm text-muted-foreground">
                  Create a file to start coding.
                </div>
              ) : (
                rootNodes.map((node) => (
                  <FileTreeNode
                    key={node.id}
                    activeFileId={activeFileId}
                    childMap={childMap}
                    deleteNode={deleteNode}
                    expandedFolderIds={expandedFolderIds}
                    level={0}
                    node={node}
                    renameNode={renameNode}
                    renamingNodeId={renamingNodeId}
                    reorderNode={reorderNode}
                    selectFile={selectFile}
                    setRenamingNodeId={setRenamingNodeId}
                    toggleFolder={toggleFolder}
                    createFile={createFile}
                    createFolder={createFolder}
                    setIsRootDropTarget={setIsRootDropTarget}
                    draggingNodeId={draggingNodeId}
                    dropTargetNodeId={dropTargetNodeId}
                    nodeMap={nodeMap}
                    setDraggingNodeId={setDraggingNodeId}
                    setDropTargetNodeId={setDropTargetNodeId}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-44">
          <ContextMenuGroup>
            <ContextMenuItem onClick={createRootFile}>
              <FileCode2 />
              New file
            </ContextMenuItem>
            <ContextMenuItem onClick={createRootFolder}>
              <Folder />
              New folder
            </ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>

      {workspaceError ? (
        <div className="border-t px-3 py-2 text-xs text-destructive">
          {workspaceError}
        </div>
      ) : null}
    </aside>
  );
});

const FileTreeNode = memo(function FileTreeNode({
  activeFileId,
  childMap,
  createFile,
  createFolder,
  deleteNode,
  expandedFolderIds,
  level,
  node,
  renameNode,
  renamingNodeId,
  reorderNode,
  selectFile,
  setRenamingNodeId,
  toggleFolder,
  draggingNodeId,
  dropTargetNodeId,
  nodeMap,
  setDraggingNodeId,
  setDropTargetNodeId,
  setIsRootDropTarget,
}: {
  activeFileId: string | null;
  childMap: Map<string, FileSystemNode[]>;
  createFile: (parentId?: string | null) => Promise<string | null>;
  createFolder: (parentId?: string | null) => Promise<string | null>;
  deleteNode: (id: string) => Promise<void>;
  expandedFolderIds: string[];
  level: number;
  node: FileSystemNode;
  renameNode: (id: string, name: string) => Promise<void>;
  renamingNodeId: string | null;
  reorderNode: (draggedId: string, targetId: string) => Promise<void>;
  selectFile: (id: string) => Promise<void>;
  setRenamingNodeId: (id: string | null) => void;
  toggleFolder: (id: string) => void;
  draggingNodeId: string | null;
  dropTargetNodeId: string | null;
  nodeMap: Map<string, FileSystemNode>;
  setDraggingNodeId: (id: string | null) => void;
  setDropTargetNodeId: (id: string | null) => void;
  setIsRootDropTarget: (value: boolean) => void;
}) {
  const isFolder = node.kind === "folder";
  const isExpanded = expandedFolderIds.includes(node.id);
  const isActive = node.id === activeFileId;
  const isDropTarget = node.id === dropTargetNodeId;
  const children = childMap.get(node.id) ?? [];
  const rowRef = useRef<HTMLDivElement | null>(null);
  const startRename = useCallback(() => {
    setRenamingNodeId(node.id);
  }, [node.id, setRenamingNodeId]);
  const createChildFile = useCallback(
    () =>
      void createFile(node.id).then((createdNodeId) => {
        setRenamingNodeId(createdNodeId);
      }),
    [createFile, node.id, setRenamingNodeId],
  );
  const createChildFolder = useCallback(
    () =>
      void createFolder(node.id).then((createdNodeId) => {
        setRenamingNodeId(createdNodeId);
      }),
    [createFolder, node.id, setRenamingNodeId],
  );
  const deleteCurrentNode = useCallback(() => {
    const confirmed = window.confirm(
      node.kind === "folder"
        ? `Delete folder "${node.name}" and everything inside it?`
        : `Delete file "${node.name}"?`,
    );

    if (confirmed) {
      void deleteNode(node.id);
    }
  }, [deleteNode, node.id, node.kind, node.name]);
  const activateNode = useCallback(() => {
    if (isFolder) {
      toggleFolder(node.id);
      return;
    }

    void selectFile(node.id);
  }, [isFolder, node.id, selectFile, toggleFolder]);
  const canDropOnNode = useCallback(
    (draggedId: string | null) => {
      if (!draggedId || draggedId === node.id) return false;

      const draggedNode = nodeMap.get(draggedId);

      if (!draggedNode || isDescendantOf(nodeMap, node.id, draggedNode.id)) {
        return false;
      }

      if (node.kind === "folder") {
        return draggedNode.parentId !== node.id;
      }

      return (
        draggedNode.kind === node.kind && draggedNode.parentId === node.parentId
      );
    },
    [node.id, node.kind, node.parentId, nodeMap],
  );
  const canDropInsideFolder = useCallback(
    (draggedId: string | null) => {
      if (!draggedId || !isFolder || draggedId === node.id) return false;

      const draggedNode = nodeMap.get(draggedId);

      return (
        Boolean(draggedNode) &&
        draggedNode?.parentId !== node.id &&
        !isDescendantOf(nodeMap, node.id, draggedId)
      );
    },
    [isFolder, node.id, nodeMap],
  );
  const dropInsideFolder = useCallback(
    (draggedId: string | null) => {
      if (!draggedId || !canDropInsideFolder(draggedId)) return;

      void reorderNode(draggedId, node.id);
      setDraggingNodeId(null);
      setDropTargetNodeId(null);
      setIsRootDropTarget(false);
    },
    [
      canDropInsideFolder,
      node.id,
      reorderNode,
      setDraggingNodeId,
      setDropTargetNodeId,
      setIsRootDropTarget,
    ],
  );

  return (
    <div className="flex flex-col gap-0.5">
      <ContextMenu>
        <ContextMenuTrigger
          className={cn(
            "group flex min-h-8 cursor-pointer items-center gap-1 rounded-lg px-1 text-sm",
            isActive && "bg-primary text-primary-foreground",
            isDropTarget && "ring-2 ring-primary/55",
            !isActive &&
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
          draggable={renamingNodeId !== node.id}
          onDragEnd={() => {
            setDraggingNodeId(null);
            setDropTargetNodeId(null);
            setIsRootDropTarget(false);
          }}
          onDragLeave={() => {
            if (dropTargetNodeId === node.id) {
              setDropTargetNodeId(null);
            }
          }}
          onDragOver={(event) => {
            if (!canDropOnNode(draggingNodeId)) return;

            event.preventDefault();
            setDropTargetNodeId(node.id);
          }}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", node.id);
            setCleanDragImage(event, rowRef.current, level);
            setDraggingNodeId(node.id);
          }}
          onDrop={(event) => {
            event.preventDefault();

            const draggedId =
              event.dataTransfer.getData("text/plain") || draggingNodeId;

            if (draggedId && canDropOnNode(draggedId)) {
              void reorderNode(draggedId, node.id);
              if (node.kind === "folder" && !isExpanded) {
                toggleFolder(node.id);
              }
            }

            setDraggingNodeId(null);
            setDropTargetNodeId(null);
          }}
          onClick={activateNode}
          ref={rowRef}
          style={{ paddingLeft: `${level * 0.875 + 0.375}rem` }}
        >
          <Button
            size="icon-xs"
            variant="ghost"
            className={cn("shrink-0", !isFolder && "invisible")}
            tabIndex={isFolder ? 0 : -1}
            onClick={(event) => {
              event.stopPropagation();
              toggleFolder(node.id);
            }}
          >
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
            <span className="sr-only">Toggle folder</span>
          </Button>

          {isFolder ? (
            isExpanded ? (
              <FolderOpen className="size-4 shrink-0" />
            ) : (
              <Folder className="size-4 shrink-0" />
            )
          ) : (
            <FileCode2 className="size-4 shrink-0" />
          )}

          {renamingNodeId === node.id ? (
            <RenameInput
              initialName={node.name}
              nodeId={node.id}
              renameNode={renameNode}
              setRenamingNodeId={setRenamingNodeId}
            />
          ) : (
            <span className="min-w-0 flex-1 truncate text-left">
              {node.name}
            </span>
          )}

          <NodeMenu
            isFolder={isFolder}
            onCreateFile={createChildFile}
            onCreateFolder={createChildFolder}
            onDelete={deleteCurrentNode}
            onRename={startRename}
          />
        </ContextMenuTrigger>
        <FileNodeContextMenu
          isFolder={isFolder}
          onCreateFile={createChildFile}
          onCreateFolder={createChildFolder}
          onDelete={deleteCurrentNode}
          onRename={startRename}
        />
      </ContextMenu>

      {isFolder && isExpanded ? (
        <div
          className={cn(
            "ml-4 flex min-h-4 flex-col gap-0.5 rounded-2xl border-l border-transparent pl-1",
            isDropTarget && "border-primary/45 bg-primary/5",
          )}
          onDragLeave={(event) => {
            if (
              event.currentTarget === event.target &&
              dropTargetNodeId === node.id
            ) {
              setDropTargetNodeId(null);
            }
          }}
          onDragOver={(event) => {
            if (!canDropInsideFolder(draggingNodeId)) return;

            event.preventDefault();
            event.stopPropagation();
            setDropTargetNodeId(node.id);
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();

            dropInsideFolder(
              event.dataTransfer.getData("text/plain") || draggingNodeId,
            );
          }}
        >
          {children.map((child) => (
            <FileTreeNode
              key={child.id}
              activeFileId={activeFileId}
              childMap={childMap}
              createFile={createFile}
              createFolder={createFolder}
              deleteNode={deleteNode}
              expandedFolderIds={expandedFolderIds}
              level={level + 1}
              node={child}
              renameNode={renameNode}
              renamingNodeId={renamingNodeId}
              reorderNode={reorderNode}
              selectFile={selectFile}
              setRenamingNodeId={setRenamingNodeId}
              toggleFolder={toggleFolder}
              draggingNodeId={draggingNodeId}
              dropTargetNodeId={dropTargetNodeId}
              nodeMap={nodeMap}
              setDraggingNodeId={setDraggingNodeId}
              setDropTargetNodeId={setDropTargetNodeId}
              setIsRootDropTarget={setIsRootDropTarget}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
});

const RenameInput = memo(function RenameInput({
  initialName,
  nodeId,
  renameNode,
  setRenamingNodeId,
}: {
  initialName: string;
  nodeId: string;
  renameNode: (id: string, name: string) => Promise<void>;
  setRenamingNodeId: (id: string | null) => void;
}) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const submitRename = useCallback(() => {
    setRenamingNodeId(null);
    void renameNode(nodeId, name);
  }, [name, nodeId, renameNode, setRenamingNodeId]);

  useEffect(() => {
    const input = inputRef.current;

    if (!input) return;

    const extensionStart = initialName.toLocaleLowerCase().endsWith(".asm")
      ? initialName.length - ".asm".length
      : initialName.length;

    input.setSelectionRange(0, extensionStart);
  }, [initialName]);

  return (
    <Input
      autoFocus
      className="h-7 flex-1 rounded-xl bg-background"
      ref={inputRef}
      value={name}
      onBlur={submitRename}
      onChange={(event) => setName(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          submitRename();
        }

        if (event.key === "Escape") {
          setRenamingNodeId(null);
        }
      }}
    />
  );
});

const NodeMenu = memo(function NodeMenu({
  isFolder,
  onCreateFile,
  onCreateFolder,
  onDelete,
  onRename,
}: {
  isFolder: boolean;
  onCreateFile: () => void;
  onCreateFolder: () => void;
  onDelete: () => void;
  onRename: () => void;
}) {
  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon-xs"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 aria-expanded:opacity-100"
            >
              <MoreHorizontal />
              <span className="sr-only">File actions</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            {isFolder ? (
              <>
                <DropdownMenuItem onClick={onCreateFile}>
                  <Plus />
                  New file
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCreateFolder}>
                  <Folder />
                  New folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem onClick={onRename}>
              <Pencil />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

const FileNodeContextMenu = memo(function FileNodeContextMenu({
  isFolder,
  onCreateFile,
  onCreateFolder,
  onDelete,
  onRename,
}: {
  isFolder: boolean;
  onCreateFile: () => void;
  onCreateFolder: () => void;
  onDelete: () => void;
  onRename: () => void;
}) {
  return (
    <ContextMenuContent className="w-44">
      <ContextMenuGroup>
        {isFolder ? (
          <>
            <ContextMenuItem onClick={onCreateFile}>
              <Plus />
              New file
            </ContextMenuItem>
            <ContextMenuItem onClick={onCreateFolder}>
              <Folder />
              New folder
            </ContextMenuItem>
          </>
        ) : null}
        <ContextMenuItem onClick={onRename}>
          <Pencil />
          Rename
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 />
          Delete
        </ContextMenuItem>
      </ContextMenuGroup>
    </ContextMenuContent>
  );
});

function buildChildMap(nodes: FileSystemNode[]) {
  const childMap = new Map<string, FileSystemNode[]>();

  for (const node of nodes) {
    const parentKey = node.parentId ?? "root";
    const siblings = childMap.get(parentKey) ?? [];

    siblings.push(node);
    childMap.set(parentKey, siblings);
  }

  for (const siblings of childMap.values()) {
    siblings.sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === "folder" ? -1 : 1;
      }

      if (a.sortOrder !== undefined || b.sortOrder !== undefined) {
        return (
          (a.sortOrder ?? Number.MAX_SAFE_INTEGER) -
          (b.sortOrder ?? Number.MAX_SAFE_INTEGER)
        );
      }

      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  }

  return childMap;
}

function getSaveLabel(status: string) {
  if (status === "loading") return "Loading workspace";
  if (status === "saving") return "Saving locally";
  if (status === "error") return "Local save issue";

  return "Saved locally";
}

function setCleanDragImage(
  event: React.DragEvent,
  rowElement: HTMLDivElement | null,
  level: number,
) {
  if (!rowElement) return;

  const clone = rowElement.cloneNode(true) as HTMLDivElement;
  const { height, width } = rowElement.getBoundingClientRect();

  clone.style.background = "var(--popover)";
  clone.style.borderRadius = "9999px";
  clone.style.boxShadow = "var(--shadow-lg)";
  clone.style.color = "var(--popover-foreground)";
  clone.style.height = `${height}px`;
  clone.style.left = "-9999px";
  clone.style.opacity = "0.96";
  clone.style.paddingLeft = `${level * 0.875 + 0.375}rem`;
  clone.style.pointerEvents = "none";
  clone.style.position = "fixed";
  clone.style.top = "0";
  clone.style.width = `${width}px`;

  document.body.appendChild(clone);
  event.dataTransfer.setDragImage(clone, 18, height / 2);
  window.setTimeout(() => clone.remove(), 0);
}

function isDescendantOf(
  nodeMap: Map<string, FileSystemNode>,
  candidateId: string,
  ancestorId: string,
) {
  let parentId = nodeMap.get(candidateId)?.parentId ?? null;

  while (parentId) {
    if (parentId === ancestorId) return true;
    parentId = nodeMap.get(parentId)?.parentId ?? null;
  }

  return false;
}
