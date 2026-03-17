import React, { useRef, useEffect, useState } from "react";
import "@xterm/xterm/css/xterm.css";

type Props = {
  projectPath: string | null;
};

export function TerminalPanel({ projectPath }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const [terminalId, setTerminalId] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;

    async function initTerminal() {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      if (disposed) return;

      const fitAddon = new FitAddon();
      fitAddonRef.current = fitAddon;

      const term = new Terminal({
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 13,
        lineHeight: 1.4,
        theme: {
          background: "#11111b",
          foreground: "#cdd6f4",
          cursor: "#f5e0dc",
          cursorAccent: "#11111b",
          selectionBackground: "#45475a",
          black: "#45475a",
          red: "#f38ba8",
          green: "#a6e3a1",
          yellow: "#f9e2af",
          blue: "#89b4fa",
          magenta: "#cba6f7",
          cyan: "#94e2d5",
          white: "#bac2de",
          brightBlack: "#585b70",
          brightRed: "#f38ba8",
          brightGreen: "#a6e3a1",
          brightYellow: "#f9e2af",
          brightBlue: "#89b4fa",
          brightMagenta: "#cba6f7",
          brightCyan: "#94e2d5",
          brightWhite: "#a6adc8",
        },
        cursorBlink: true,
        cursorStyle: "bar",
        scrollback: 5000,
      });

      term.loadAddon(fitAddon);
      term.open(containerRef.current!);
      fitAddon.fit();
      terminalRef.current = term;

      // Create PTY on main process
      try {
        // @ts-ignore
        const result = await window.rpc?.request?.terminalCreate?.({
          cols: term.cols,
          rows: term.rows,
          cwd: projectPath ?? undefined,
        });

        if (result?.terminalId) {
          setTerminalId(result.terminalId);

          // Send keystrokes to PTY
          term.onData((data: string) => {
            // @ts-ignore
            window.rpc?.request?.terminalWrite?.({
              terminalId: result.terminalId,
              data,
            });
          });

          // Handle resize
          term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
            // @ts-ignore
            window.rpc?.request?.terminalResize?.({
              terminalId: result.terminalId,
              cols,
              rows,
            });
          });
        }
      } catch (err) {
        term.writeln(`\x1b[31mFailed to create terminal: ${err}\x1b[0m`);
      }

      // Listen for PTY output from main process
      // @ts-ignore
      window.rpc?.on?.terminalData?.((payload: { terminalId: string; data: string }) => {
        if (terminalRef.current) {
          terminalRef.current.write(payload.data);
        }
      });

      // @ts-ignore
      window.rpc?.on?.terminalExit?.((payload: { terminalId: string; exitCode: number | null }) => {
        if (terminalRef.current) {
          terminalRef.current.writeln(
            `\r\n\x1b[33m[Process exited with code ${payload.exitCode}]\x1b[0m`,
          );
        }
      });
    }

    initTerminal();

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      fitAddonRef.current?.fit();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      terminalRef.current?.dispose();
      if (terminalId) {
        // @ts-ignore
        window.rpc?.request?.terminalKill?.({ terminalId });
      }
    };
  }, [projectPath]);

  return (
    <div className="h-52 bg-editor-panel flex flex-col">
      <div className="flex items-center px-3 py-1 border-b border-editor-border">
        <span className="text-xs font-medium text-editor-muted">TERMINAL</span>
      </div>
      <div ref={containerRef} className="flex-1 p-1" />
    </div>
  );
}
