// RPC bridge — connects webview to Electrobun main process
// Uses electrobun/view API which communicates via encrypted WebSocket

import Electrobun, { Electroview } from "electrobun/view";
import type { AppRPC } from "../shared/types";

// Define the webview-side RPC (handles messages FROM bun)
const rpcDef = Electroview.defineRPC<AppRPC>({
  handlers: {
    requests: {},
    messages: {
      terminalData: (payload: { terminalId: string; data: string }) => {
        // Dispatch custom event for TerminalPanel to listen to
        window.dispatchEvent(
          new CustomEvent("ctt:terminalData", { detail: payload }),
        );
      },
      terminalExit: (payload: { terminalId: string; exitCode: number | null }) => {
        window.dispatchEvent(
          new CustomEvent("ctt:terminalExit", { detail: payload }),
        );
      },
      cttStreamChunk: (payload: { requestId: string; chunk: string; done: boolean }) => {
        window.dispatchEvent(
          new CustomEvent("ctt:streamChunk", { detail: payload }),
        );
      },
      fileChanged: (payload: { path: string; event: "create" | "modify" | "delete" }) => {
        window.dispatchEvent(
          new CustomEvent("ctt:fileChanged", { detail: payload }),
        );
      },
    },
  },
});

// Initialize Electrobun connection
const electrobun = new Electrobun.Electroview({ rpc: rpcDef });

// Export the RPC for use in components
export const rpc = rpcDef as any;

// Helper: make RPC request to bun main process
export async function rpcRequest<T = any>(
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  return await (rpc as any).request[method](params);
}
