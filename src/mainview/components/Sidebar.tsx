import React, { useState, useEffect, useCallback } from "react";
import { rpc } from "../rpc";
import type { FileEntry } from "../types";

type Props = {
  projectPath: string | null;
  onOpenFile: (file: FileEntry) => void;
  onOpenFolder: () => void;
};

type TreeNode = FileEntry & {
  children?: TreeNode[];
  isExpanded?: boolean;
  isLoaded?: boolean;
};

export function Sidebar({ projectPath, onOpenFile, onOpenFolder }: Props) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FileEntry[]>([]);

  // Load root files when project changes
  useEffect(() => {
    if (!projectPath) {
      setTree([]);
      return;
    }
    loadDirectory("").then((files) => {
      setTree(files.map((f) => ({ ...f, isExpanded: false, isLoaded: false })));
    });
  }, [projectPath]);

  const loadDirectory = useCallback(
    async (relativePath: string): Promise<FileEntry[]> => {
      if (!projectPath) return [];
      try {
        const result = await rpc.request.listFiles({
          projectPath,
          relativePath: relativePath || undefined,
        });
        return result?.files ?? [];
      } catch {
        return [];
      }
    },
    [projectPath],
  );

  const toggleDirectory = useCallback(
    async (node: TreeNode, path: string[]) => {
      const updateTree = (nodes: TreeNode[], pathIndex: number): TreeNode[] =>
        nodes.map((n) => {
          if (n.path === path[pathIndex]) {
            if (pathIndex === path.length - 1) {
              // Toggle this node
              if (!n.isLoaded && n.isDirectory) {
                // Load children
                loadDirectory(n.path).then((children) => {
                  setTree((prev) =>
                    updateNodeInTree(prev, n.path, {
                      children: children.map((c) => ({
                        ...c,
                        isExpanded: false,
                        isLoaded: false,
                      })),
                      isExpanded: true,
                      isLoaded: true,
                    }),
                  );
                });
                return { ...n, isExpanded: true };
              }
              return { ...n, isExpanded: !n.isExpanded };
            }
            return { ...n, children: updateTree(n.children ?? [], pathIndex + 1) };
          }
          return n;
        });

      setTree((prev) => updateTree(prev, 0));
    },
    [loadDirectory],
  );

  // Search
  useEffect(() => {
    if (!searchQuery || !projectPath) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const result = await rpc.request.searchFiles({
          projectPath,
          query: searchQuery,
        });
        setSearchResults(result?.files ?? []);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, projectPath]);

  if (!projectPath) {
    return (
      <div className="w-60 bg-editor-sidebar flex flex-col items-center justify-center p-4">
        <p className="text-editor-muted text-sm text-center mb-4">No folder open</p>
        <button
          onClick={onOpenFolder}
          className="px-4 py-2 bg-editor-active text-editor-panel rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Open Folder
        </button>
      </div>
    );
  }

  return (
    <div className="w-60 bg-editor-sidebar flex flex-col overflow-hidden">
      {/* Search bar */}
      <div className="p-2 border-b border-editor-border">
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-2 py-1.5 bg-editor-surface border border-editor-border rounded text-sm text-editor-text placeholder:text-editor-muted focus:outline-none focus:border-editor-active"
        />
      </div>

      {/* File tree or search results */}
      <div className="flex-1 overflow-y-auto py-1">
        {searchQuery ? (
          searchResults.map((file) => (
            <FileItem
              key={file.path}
              file={file}
              depth={0}
              onClick={() => onOpenFile(file)}
            />
          ))
        ) : (
          <FileTree
            nodes={tree}
            depth={0}
            onToggle={toggleDirectory}
            onOpenFile={onOpenFile}
          />
        )}
      </div>
    </div>
  );
}

// ── File Tree Component ────────────────────────────────────────────

function FileTree({
  nodes,
  depth,
  onToggle,
  onOpenFile,
}: {
  nodes: TreeNode[];
  depth: number;
  onToggle: (node: TreeNode, path: string[]) => void;
  onOpenFile: (file: FileEntry) => void;
}) {
  return (
    <>
      {nodes.map((node) => (
        <React.Fragment key={node.path}>
          <FileItem
            file={node}
            depth={depth}
            isExpanded={node.isExpanded}
            onClick={() => {
              if (node.isDirectory) {
                onToggle(node, [node.path]);
              } else {
                onOpenFile(node);
              }
            }}
          />
          {node.isDirectory && node.isExpanded && node.children && (
            <FileTree
              nodes={node.children}
              depth={depth + 1}
              onToggle={onToggle}
              onOpenFile={onOpenFile}
            />
          )}
        </React.Fragment>
      ))}
    </>
  );
}

// ── File Item Component ────────────────────────────────────────────

type TreeNode = FileEntry & {
  isExpanded?: boolean;
  isLoaded?: boolean;
  children?: TreeNode[];
};

function FileItem({
  file,
  depth,
  isExpanded,
  onClick,
}: {
  file: FileEntry;
  depth: number;
  isExpanded?: boolean;
  onClick: () => void;
}) {
  const icon = file.isDirectory
    ? isExpanded
      ? "📂"
      : "📁"
    : getFileIcon(file.name);

  return (
    <div
      className="file-entry flex items-center px-2 py-0.5 cursor-pointer text-sm"
      style={{ paddingLeft: `${8 + depth * 16}px` }}
      onClick={onClick}
    >
      <span className="mr-1.5 text-xs flex-shrink-0">{icon}</span>
      <span className="truncate text-editor-text">{file.name}</span>
    </div>
  );
}

function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const icons: Record<string, string> = {
    ts: "🔷",
    tsx: "⚛️",
    js: "🟨",
    jsx: "⚛️",
    json: "📋",
    html: "🌐",
    css: "🎨",
    md: "📝",
    py: "🐍",
    rs: "🦀",
    go: "🐹",
    php: "🐘",
    sql: "🗃️",
    sh: "🐚",
    yml: "⚙️",
    yaml: "⚙️",
    toml: "⚙️",
    lock: "🔒",
    gitignore: "🙈",
  };
  return icons[ext] ?? "📄";
}

// ── Helper ─────────────────────────────────────────────────────────
function updateNodeInTree(
  nodes: TreeNode[],
  targetPath: string,
  update: Partial<TreeNode>,
): TreeNode[] {
  return nodes.map((n) => {
    if (n.path === targetPath) return { ...n, ...update };
    if (n.children) return { ...n, children: updateNodeInTree(n.children, targetPath, update) };
    return n;
  });
}
