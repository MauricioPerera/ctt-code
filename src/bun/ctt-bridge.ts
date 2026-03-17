// CTT Bridge — Communicates with ctt-shell via MCP protocol (JSON-RPC 2.0 over stdio)
// Spawns ctt-shell as a subprocess and sends/receives MCP messages

import { spawn, type Subprocess } from "bun";

type MCPRequest = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: Record<string, unknown>;
};

type MCPResponse = {
  jsonrpc: "2.0";
  id: number;
  result?: { content: Array<{ type: string; text: string }> };
  error?: { code: number; message: string };
};

export class CttBridge {
  private process: Subprocess | null = null;
  private requestId = 0;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private buffer = "";
  private initialized = false;

  // Path to ctt-shell — configurable
  private cttShellPath: string;

  constructor(cttShellPath?: string) {
    // Default: look for ctt-shell in common locations
    this.cttShellPath = cttShellPath ?? this.findCttShell();
  }

  private findCttShell(): string {
    // Try to find ctt-shell
    const candidates = [
      // Sibling repo (development)
      "../ctt-shell/dist/cli/cli.js",
      // Global npm install
      "ctt-shell",
      // Local node_modules
      "./node_modules/.bin/ctt-shell",
    ];

    for (const c of candidates) {
      try {
        const proc = Bun.spawnSync(["node", "-e", `require.resolve("${c}")`]);
        if (proc.exitCode === 0) return c;
      } catch { /* continue */ }
    }

    // Fallback to sibling repo path (most likely in dev)
    return "../ctt-shell/dist/cli/cli.js";
  }

  private async ensureProcess(): Promise<void> {
    if (this.process && !this.process.killed) return;

    this.process = spawn(["node", this.cttShellPath, "mcp"], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });

    // Read stdout for MCP responses
    this.readOutput();

    // Initialize MCP handshake
    await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "ctt-code", version: "0.1.0" },
    });

    // Send initialized notification
    this.sendNotification("notifications/initialized", {});
    this.initialized = true;
  }

  private async readOutput(): Promise<void> {
    if (!this.process?.stdout) return;

    const reader = this.process.stdout.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        this.buffer += decoder.decode(value, { stream: true });
        this.processBuffer();
      }
    } catch {
      // Process ended
    }
  }

  private processBuffer(): void {
    // MCP uses Content-Length framing
    while (this.buffer.length > 0) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) break;

      const header = this.buffer.substring(0, headerEnd);
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        // Skip malformed header
        this.buffer = this.buffer.substring(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(match[1], 10);
      const bodyStart = headerEnd + 4;

      if (this.buffer.length < bodyStart + contentLength) break; // Wait for more data

      const body = this.buffer.substring(bodyStart, bodyStart + contentLength);
      this.buffer = this.buffer.substring(bodyStart + contentLength);

      try {
        const message = JSON.parse(body) as MCPResponse;
        if (message.id !== undefined && this.pending.has(message.id)) {
          const { resolve, reject } = this.pending.get(message.id)!;
          this.pending.delete(message.id);

          if (message.error) {
            reject(new Error(message.error.message));
          } else {
            resolve(message.result);
          }
        }
      } catch {
        // Skip malformed JSON
      }
    }
  }

  private sendRaw(message: Record<string, unknown>): void {
    if (!this.process?.stdin) return;
    const body = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n`;
    const writer = this.process.stdin.getWriter();
    writer.write(new TextEncoder().encode(header + body));
    writer.releaseLock();
  }

  private sendNotification(method: string, params: Record<string, unknown>): void {
    this.sendRaw({ jsonrpc: "2.0", method, params });
  }

  private sendRequest(method: string, params: Record<string, unknown>): Promise<any> {
    const id = ++this.requestId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.sendRaw({ jsonrpc: "2.0", id, method, params } as MCPRequest);

      // Timeout after 30s
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error("MCP request timeout"));
        }
      }, 30_000);
    });
  }

  private async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    await this.ensureProcess();
    const result = await this.sendRequest("tools/call", { name, arguments: args });
    const content = result?.content;
    if (Array.isArray(content) && content.length > 0) {
      return content[0].text ?? JSON.stringify(content[0]);
    }
    return JSON.stringify(result);
  }

  // ── Public API ─────────────────────────────────────────────────

  async chat(message: string, projectPath?: string): Promise<string> {
    try {
      // Use ctt_recall for context, then build a response
      const contextJson = await this.callTool("ctt_recall", {
        goal: message,
        compact: true,
      });

      // For now return the recall context — in production, this would
      // feed into an LLM with the user message + context
      return contextJson;
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async execute(goal: string, domain?: string): Promise<{
    success: boolean;
    plan?: unknown;
    execution?: unknown;
    events?: string[];
    error?: string;
  }> {
    try {
      const resultJson = await this.callTool("ctt_execute", {
        goal,
        ...(domain ? { domain } : {}),
      });
      return JSON.parse(resultJson);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async search(query: string, limit?: number): Promise<{
    results: Array<{ score: number; name: string; type: string }>;
  }> {
    try {
      const resultJson = await this.callTool("ctt_search", {
        query,
        ...(limit ? { limit } : {}),
      });
      return JSON.parse(resultJson);
    } catch {
      return { results: [] };
    }
  }

  async getDomains(): Promise<{
    domains: Array<{ id: string; name: string; operations: number }>;
  }> {
    try {
      const resultJson = await this.callTool("ctt_list_domains", {});
      return JSON.parse(resultJson);
    } catch {
      return { domains: [] };
    }
  }

  async shellCommand(command: string, role: string = "dev"): Promise<string> {
    return await this.callTool("ctt_shell", { command, role });
  }

  dispose(): void {
    this.process?.kill();
    this.process = null;
    this.initialized = false;
    this.pending.clear();
  }
}
