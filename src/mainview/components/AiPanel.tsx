import React, { useState, useRef, useCallback, useEffect } from "react";
import type { ChatMessage } from "../types";

type Props = {
  projectPath: string | null;
  activeFile: string | null;
  onInsertCode: (code: string) => void;
};

export function AiPanel({ projectPath, activeFile, onInsertCode }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your CTT-Shell AI assistant. I can help you with:\n\n" +
        "- **Code generation** — describe what you need\n" +
        "- **Shell commands** — ask me to run anything\n" +
        "- **Git operations** — commits, branches, diffs\n" +
        "- **Search** — find code, files, patterns\n" +
        "- **Autonomous tasks** — full goal → plan → execute pipeline\n\n" +
        "Type a message to get started!",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<"chat" | "execute" | "search">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      let reply: string;

      if (activeMode === "execute") {
        // @ts-ignore
        const result = await window.rpc?.request?.cttExecute?.({
          goal: text,
        });
        reply = result?.success
          ? `✅ **Execution successful**\n\n${JSON.stringify(result.plan, null, 2)}`
          : `❌ **Execution failed**: ${result?.error ?? "Unknown error"}`;
      } else if (activeMode === "search") {
        // @ts-ignore
        const result = await window.rpc?.request?.cttSearch?.({
          query: text,
          limit: 10,
        });
        const items = result?.results ?? [];
        reply = items.length
          ? `Found ${items.length} results:\n\n${items.map((r: any) => `- **${r.name}** (${r.type}) — score: ${r.score.toFixed(3)}`).join("\n")}`
          : "No results found.";
      } else {
        // Chat mode — use ctt recall + response
        // @ts-ignore
        const result = await window.rpc?.request?.cttChat?.({
          message: text,
          projectPath: projectPath ?? undefined,
        });
        reply = result?.reply ?? "No response received.";
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: `⚠️ Error: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, activeMode, projectPath]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-80 bg-editor-sidebar flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-editor-border">
        <span className="text-sm font-medium text-editor-text">⚡ CTT AI</span>
        {activeFile && (
          <span className="text-xs text-editor-muted truncate max-w-[120px]">{activeFile}</span>
        )}
      </div>

      {/* Mode selector */}
      <div className="flex border-b border-editor-border">
        {(["chat", "execute", "search"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setActiveMode(mode)}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
              activeMode === mode
                ? "text-editor-active border-b-2 border-editor-active"
                : "text-editor-muted hover:text-editor-text"
            }`}
          >
            {mode === "chat" ? "💬 Chat" : mode === "execute" ? "🚀 Execute" : "🔍 Search"}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm ${
              msg.role === "user"
                ? "bg-editor-hover rounded-lg p-2.5 ml-4"
                : "ai-message text-editor-text"
            }`}
          >
            <div className="whitespace-pre-wrap break-words">{msg.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-editor-muted text-sm">
            <div className="animate-pulse">⚡</div>
            <span>Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-editor-border">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeMode === "execute"
                ? "Describe a goal to execute..."
                : activeMode === "search"
                  ? "Search knowledge, skills, patterns..."
                  : "Ask anything..."
            }
            rows={2}
            className="w-full px-3 py-2 bg-editor-surface border border-editor-border rounded-lg text-sm text-editor-text placeholder:text-editor-muted resize-none focus:outline-none focus:border-editor-active"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 bottom-2 p-1 rounded bg-editor-active text-editor-panel disabled:opacity-30 hover:opacity-90 transition-opacity"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 14l12-6L2 2v5l8 1-8 1v5z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
