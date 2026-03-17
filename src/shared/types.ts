import type { RPCSchema } from "electrobun/bun";

// ── File System Types ──────────────────────────────────────────────
export type FileEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
};

// ── Git Types ──────────────────────────────────────────────────────
export type GitChange = {
  file: string;
  status: string;
};

export type GitBranch = {
  name: string;
  current: boolean;
};

// ── AI/CTT Types ───────────────────────────────────────────────────
export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
};

export type CttToolResult = {
  tool: string;
  success: boolean;
  data: unknown;
};

// ── Terminal Types ─────────────────────────────────────────────────
export type TerminalInfo = {
  terminalId: string;
};

// ── RPC Schema ─────────────────────────────────────────────────────
export type AppRPC = {
  bun: RPCSchema<{
    requests: {
      // File system
      openFolder: {
        params: {};
        response: { paths: string[] } | null;
      };
      listFiles: {
        params: { projectPath: string; relativePath?: string };
        response: { files: FileEntry[] };
      };
      readFile: {
        params: { projectPath: string; filePath: string };
        response: { content: string; language: string };
      };
      writeFile: {
        params: { projectPath: string; filePath: string; content: string };
        response: { ok: true };
      };
      createFile: {
        params: { projectPath: string; filePath: string };
        response: { ok: true };
      };
      createFolder: {
        params: { projectPath: string; folderPath: string };
        response: { ok: true };
      };
      deleteEntry: {
        params: { projectPath: string; entryPath: string };
        response: { ok: true };
      };
      searchFiles: {
        params: { projectPath: string; query: string };
        response: { files: FileEntry[] };
      };
      searchInFiles: {
        params: { projectPath: string; query: string; glob?: string };
        response: { results: Array<{ file: string; line: number; text: string }> };
      };

      // Git
      getGitStatus: {
        params: { projectPath: string };
        response: { changes: GitChange[] };
      };
      getGitBranches: {
        params: { projectPath: string };
        response: { branches: GitBranch[] };
      };

      // AI / CTT-Shell
      cttChat: {
        params: { message: string; projectPath?: string };
        response: { reply: string; toolResults?: CttToolResult[] };
      };
      cttExecute: {
        params: { goal: string; domain?: string };
        response: {
          success: boolean;
          plan?: unknown;
          execution?: unknown;
          events?: string[];
          error?: string;
        };
      };
      cttSearch: {
        params: { query: string; limit?: number };
        response: { results: Array<{ score: number; name: string; type: string }> };
      };
      cttGetDomains: {
        params: {};
        response: { domains: Array<{ id: string; name: string; operations: number }> };
      };

      // Terminal
      terminalCreate: {
        params: { cols: number; rows: number; cwd?: string };
        response: TerminalInfo;
      };
      terminalWrite: {
        params: { terminalId: string; data: string };
        response: { ok: true };
      };
      terminalResize: {
        params: { terminalId: string; cols: number; rows: number };
        response: { ok: true };
      };
      terminalKill: {
        params: { terminalId: string };
        response: { ok: true };
      };
    };
    messages: {
      // Terminal output
      terminalData: { terminalId: string; data: string };
      terminalExit: { terminalId: string; exitCode: number | null };
      // AI streaming
      cttStreamChunk: { requestId: string; chunk: string; done: boolean };
      // File watcher
      fileChanged: { path: string; event: "create" | "modify" | "delete" };
    };
  }>;
  webview: RPCSchema<{
    requests: {};
    messages: {};
  }>;
};
