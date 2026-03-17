// CTT Code — Main Process (Bun)
// Handles: file system, terminal (PTY), ctt-shell MCP subprocess, git

import { existsSync, statSync } from "node:fs";
import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import { join, resolve, extname } from "node:path";
import {
  ApplicationMenu,
  BrowserView,
  BrowserWindow,
  Updater,
  Utils,
} from "electrobun/bun";
import type { AppRPC } from "../shared/types";
import { CttBridge } from "./ctt-bridge";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

// ── Language Detection ─────────────────────────────────────────────
const LANG_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescriptreact",
  ".js": "javascript",
  ".jsx": "javascriptreact",
  ".json": "json",
  ".html": "html",
  ".css": "css",
  ".scss": "scss",
  ".md": "markdown",
  ".py": "python",
  ".rs": "rust",
  ".go": "go",
  ".php": "php",
  ".sql": "sql",
  ".sh": "shell",
  ".bash": "shell",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".xml": "xml",
  ".svg": "xml",
  ".toml": "toml",
  ".env": "dotenv",
  ".gitignore": "ignore",
  ".dockerfile": "dockerfile",
  ".vue": "vue",
  ".svelte": "svelte",
};

function detectLanguage(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const base = filePath.split("/").pop()?.toLowerCase() ?? "";
  if (base === "dockerfile") return "dockerfile";
  if (base === "makefile") return "makefile";
  return LANG_MAP[ext] ?? "plaintext";
}

// ── Terminal Management ────────────────────────────────────────────
type TerminalSession = {
  ptyProcess: any; // bun-pty IPty
};

const terminalSessions = new Map<string, TerminalSession>();
let nextTerminalId = 1;

function resolveShellPath(): string {
  if (process.platform === "win32") return "powershell.exe";
  return process.env.SHELL ?? "/bin/zsh";
}

function resolveWorkingDirectory(cwd?: string): string {
  const candidates = [cwd, process.cwd(), os.homedir(), "/tmp"];
  for (const c of candidates) {
    if (c && existsSync(c) && statSync(c).isDirectory()) return c;
  }
  return os.homedir();
}

function broadcastTerminalData(payload: { terminalId: string; data: string }) {
  for (const view of BrowserView.getAll()) {
    view.rpc.send.terminalData(payload);
  }
}

function broadcastTerminalExit(payload: { terminalId: string; exitCode: number | null }) {
  for (const view of BrowserView.getAll()) {
    view.rpc.send.terminalExit(payload);
  }
}

// ── Git Helpers ────────────────────────────────────────────────────
async function runGit(cwd: string, args: string[]): Promise<string> {
  const proc = Bun.spawn(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(stderr.trim() || `git ${args.join(" ")} failed`);
  return stdout;
}

// ── File Search Helpers ────────────────────────────────────────────
const HIDDEN_DIRS = new Set(["node_modules", ".git", ".DS_Store", "dist", ".next", ".cache", "__pycache__", ".venv"]);

async function walkSearch(
  dir: string,
  rel: string,
  query: string,
  results: Array<{ name: string; path: string; isDirectory: boolean }>,
  depth: number,
  maxResults = 30,
  maxDepth = 6,
) {
  if (depth > maxDepth || results.length >= maxResults) return;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= maxResults) break;
      if (HIDDEN_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      const entryRel = rel ? join(rel, entry.name) : entry.name;
      if (entry.name.toLowerCase().includes(query) || entryRel.toLowerCase().includes(query)) {
        results.push({ name: entry.name, path: entryRel, isDirectory: entry.isDirectory() });
      }
      if (entry.isDirectory()) {
        await walkSearch(join(dir, entry.name), entryRel, query, results, depth + 1, maxResults, maxDepth);
      }
    }
  } catch { /* skip unreadable */ }
}

// ── CTT-Shell Bridge ───────────────────────────────────────────────
const ctt = new CttBridge();

// ── RPC Definition ─────────────────────────────────────────────────
const rpc = BrowserView.defineRPC<AppRPC>({
  handlers: {
    requests: {
      // ── File System ────────────────────────────────────────────
      openFolder: async () => {
        const paths = await Utils.openFileDialog({
          startingFolder: "~/",
          allowedFileTypes: "*",
          canChooseFiles: false,
          canChooseDirectory: true,
          allowsMultipleSelection: false,
        });
        if (!paths.length || (paths.length === 1 && paths[0] === "")) return null;
        return { paths };
      },

      listFiles: async ({ projectPath, relativePath }) => {
        const dir = relativePath ? resolve(projectPath, relativePath) : projectPath;
        const entries = await readdir(dir, { withFileTypes: true });
        const filtered = entries
          .filter((e) => !HIDDEN_DIRS.has(e.name) && !e.name.startsWith("."))
          .sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
          });
        return {
          files: filtered.map((e) => ({
            name: e.name,
            path: relativePath ? join(relativePath, e.name) : e.name,
            isDirectory: e.isDirectory(),
          })),
        };
      },

      readFile: async ({ projectPath, filePath }) => {
        const fullPath = resolve(projectPath, filePath);
        const content = await readFile(fullPath, "utf-8");
        return { content, language: detectLanguage(filePath) };
      },

      writeFile: async ({ projectPath, filePath, content }) => {
        const fullPath = resolve(projectPath, filePath);
        await writeFile(fullPath, content, "utf-8");
        return { ok: true as const };
      },

      createFile: async ({ projectPath, filePath }) => {
        const fullPath = resolve(projectPath, filePath);
        await mkdir(resolve(fullPath, ".."), { recursive: true });
        await writeFile(fullPath, "", "utf-8");
        return { ok: true as const };
      },

      createFolder: async ({ projectPath, folderPath }) => {
        await mkdir(resolve(projectPath, folderPath), { recursive: true });
        return { ok: true as const };
      },

      deleteEntry: async ({ projectPath, entryPath }) => {
        await rm(resolve(projectPath, entryPath), { recursive: true, force: true });
        return { ok: true as const };
      },

      searchFiles: async ({ projectPath, query }) => {
        const results: Array<{ name: string; path: string; isDirectory: boolean }> = [];
        await walkSearch(projectPath, "", query.toLowerCase(), results, 0);
        return { files: results };
      },

      searchInFiles: async ({ projectPath, query, glob: _glob }) => {
        // Use ripgrep if available, fallback to basic search
        try {
          const args = ["rg", "--line-number", "--no-heading", "--max-count=100", query, projectPath];
          const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
          const stdout = await new Response(proc.stdout).text();
          await proc.exited;
          const results = stdout
            .trim()
            .split("\n")
            .filter(Boolean)
            .slice(0, 50)
            .map((line) => {
              const match = line.match(/^(.+?):(\d+):(.*)$/);
              if (!match) return null;
              return {
                file: match[1].replace(projectPath + "/", "").replace(projectPath + "\\", ""),
                line: parseInt(match[2], 10),
                text: match[3].trim(),
              };
            })
            .filter(Boolean) as Array<{ file: string; line: number; text: string }>;
          return { results };
        } catch {
          return { results: [] };
        }
      },

      // ── Git ──────────────────────────────────────────────────
      getGitStatus: async ({ projectPath }) => {
        const output = await runGit(projectPath, ["status", "--porcelain"]);
        const changes = output
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => ({
            file: line.slice(3).trim(),
            status: line.slice(0, 2).trim(),
          }));
        return { changes };
      },

      getGitBranches: async ({ projectPath }) => {
        const output = await runGit(projectPath, ["branch", "--format=%(refname:short)|%(HEAD)"]);
        const branches = output
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const [name, head] = line.split("|");
            return { name: name.trim(), current: head?.trim() === "*" };
          });
        return { branches };
      },

      // ── AI / CTT-Shell ───────────────────────────────────────
      cttChat: async ({ message, projectPath }) => {
        const reply = await ctt.chat(message, projectPath);
        return { reply };
      },

      cttExecute: async ({ goal, domain }) => {
        return await ctt.execute(goal, domain);
      },

      cttSearch: async ({ query, limit }) => {
        return await ctt.search(query, limit);
      },

      cttGetDomains: async () => {
        return await ctt.getDomains();
      },

      // ── Terminal ─────────────────────────────────────────────
      terminalCreate: async ({ cols, rows, cwd }) => {
        const { spawn: ptySpawn } = await import("bun-pty");
        const terminalId = `terminal-${nextTerminalId++}`;
        const resolvedCwd = resolveWorkingDirectory(cwd);
        const shell = resolveShellPath();

        const ptyProcess = ptySpawn(shell, ["-l"], {
          name: "xterm-256color",
          cols: Math.max(2, cols),
          rows: Math.max(1, rows),
          cwd: resolvedCwd,
          env: { ...process.env } as Record<string, string>,
        });

        terminalSessions.set(terminalId, { ptyProcess });

        ptyProcess.onData((data: string) => {
          broadcastTerminalData({ terminalId, data });
        });

        ptyProcess.onExit((event: { exitCode: number }) => {
          terminalSessions.delete(terminalId);
          broadcastTerminalExit({ terminalId, exitCode: event.exitCode });
        });

        return { terminalId };
      },

      terminalWrite: async ({ terminalId, data }) => {
        terminalSessions.get(terminalId)?.ptyProcess.write(data);
        return { ok: true as const };
      },

      terminalResize: async ({ terminalId, cols, rows }) => {
        const session = terminalSessions.get(terminalId);
        if (session && cols > 0 && rows > 0) session.ptyProcess.resize(cols, rows);
        return { ok: true as const };
      },

      terminalKill: async ({ terminalId }) => {
        terminalSessions.get(terminalId)?.ptyProcess.kill();
        terminalSessions.delete(terminalId);
        return { ok: true as const };
      },
    },
    messages: {},
  },
});

// ── Application Menu ───────────────────────────────────────────────
ApplicationMenu.setApplicationMenu([
  {
    label: "CTT Code",
    submenu: [
      { role: "hide" },
      { type: "separator" },
      { role: "quit" },
    ],
  },
  {
    label: "File",
    submenu: [
      { label: "Open Folder...", action: "open-folder", accelerator: "CommandOrControl+O" },
      { type: "separator" },
      { label: "Save", action: "save", accelerator: "CommandOrControl+S" },
      { label: "Save All", action: "save-all", accelerator: "CommandOrControl+Shift+S" },
    ],
  },
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "selectAll" },
    ],
  },
  {
    label: "View",
    submenu: [
      { label: "Toggle Terminal", action: "toggle-terminal", accelerator: "CommandOrControl+`" },
      { label: "Toggle AI Panel", action: "toggle-ai", accelerator: "CommandOrControl+Shift+A" },
      { label: "Toggle Sidebar", action: "toggle-sidebar", accelerator: "CommandOrControl+B" },
    ],
  },
]);

// ── Window Creation ────────────────────────────────────────────────
async function getMainViewUrl(): Promise<string> {
  const channel = await Updater.localInfo.channel();
  if (channel === "dev") {
    try {
      await fetch(DEV_SERVER_URL, { method: "HEAD" });
      console.log(`HMR enabled: Vite dev server at ${DEV_SERVER_URL}`);
      return DEV_SERVER_URL;
    } catch {
      console.log("Vite dev server not running. Use 'bun run dev:hmr' for HMR.");
    }
  }
  return "views://mainview/index.html";
}

const url = await getMainViewUrl();

new BrowserWindow({
  title: "CTT Code",
  url,
  rpc,
  frame: {
    width: 1400,
    height: 900,
    x: 100,
    y: 100,
  },
  titleBarStyle: "hiddenInset",
});

console.log("CTT Code started!");
