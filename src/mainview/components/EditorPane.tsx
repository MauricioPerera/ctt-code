import React, { useRef, useEffect, useCallback } from "react";
import type { OpenTab } from "../App";

type Props = {
  tabs: OpenTab[];
  activeTab: OpenTab | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onContentChange: (tabId: string, content: string) => void;
  onSave: (tabId: string) => void;
};

export function EditorPane({
  tabs,
  activeTab,
  onSelectTab,
  onCloseTab,
  onContentChange,
  onSave,
}: Props) {
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<any>(null);

  // Initialize Monaco Editor
  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;

    async function initMonaco() {
      // Dynamic import for Monaco
      const monaco = await import("monaco-editor");
      if (disposed) return;

      monacoRef.current = monaco;

      // Set editor theme (Catppuccin Mocha inspired)
      monaco.editor.defineTheme("ctt-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "comment", foreground: "6c7086", fontStyle: "italic" },
          { token: "keyword", foreground: "cba6f7" },
          { token: "string", foreground: "a6e3a1" },
          { token: "number", foreground: "fab387" },
          { token: "type", foreground: "89b4fa" },
          { token: "function", foreground: "89dceb" },
          { token: "variable", foreground: "cdd6f4" },
          { token: "operator", foreground: "94e2d5" },
        ],
        colors: {
          "editor.background": "#1e1e2e",
          "editor.foreground": "#cdd6f4",
          "editor.lineHighlightBackground": "#313244",
          "editor.selectionBackground": "#45475a",
          "editorCursor.foreground": "#f5e0dc",
          "editorLineNumber.foreground": "#6c7086",
          "editorLineNumber.activeForeground": "#cba6f7",
          "editor.inactiveSelectionBackground": "#313244",
          "editorIndentGuide.background": "#313244",
          "editorIndentGuide.activeBackground": "#45475a",
          "editorWidget.background": "#181825",
          "editorWidget.border": "#313244",
          "editorSuggestWidget.background": "#181825",
          "editorSuggestWidget.border": "#313244",
          "editorSuggestWidget.selectedBackground": "#313244",
        },
      });

      const editor = monaco.editor.create(containerRef.current!, {
        value: "",
        language: "typescript",
        theme: "ctt-dark",
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 14,
        lineHeight: 22,
        minimap: { enabled: true, scale: 1 },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "off",
        renderWhitespace: "selection",
        bracketPairColorization: { enabled: true },
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        padding: { top: 12 },
      });

      editorRef.current = editor;

      // Save shortcut
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        // Will be handled by active tab
      });
    }

    initMonaco();

    return () => {
      disposed = true;
      editorRef.current?.dispose();
    };
  }, []);

  // Update editor content when active tab changes
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !activeTab) return;

    const model = editor.getModel();
    if (model) {
      // Preserve cursor position
      const position = editor.getPosition();
      monaco.editor.setModelLanguage(model, activeTab.language);
      model.setValue(activeTab.content);
      if (position) editor.setPosition(position);
    }
  }, [activeTab?.id, activeTab?.language]);

  // Listen for content changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !activeTab) return;

    const disposable = editor.onDidChangeModelContent(() => {
      const value = editor.getValue();
      onContentChange(activeTab.id, value);
    });

    return () => disposable.dispose();
  }, [activeTab?.id, onContentChange]);

  // Save keybinding
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !activeTab) return;

    const disposable = editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => onSave(activeTab.id),
    );

    return () => {
      // Monaco commands don't have a direct dispose, but this works with re-registration
    };
  }, [activeTab?.id, onSave]);

  if (tabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-editor-bg">
        <div className="text-center text-editor-muted">
          <div className="text-6xl mb-4 opacity-20">⚡</div>
          <h2 className="text-xl font-medium mb-2">CTT Code</h2>
          <p className="text-sm">Open a file from the sidebar to start editing</p>
          <p className="text-xs mt-2 opacity-60">AI-powered by ctt-shell</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center bg-editor-panel border-b border-editor-border overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer border-r border-editor-border select-none ${
              tab.id === activeTab?.id
                ? "bg-editor-bg text-editor-text border-t-2 border-t-editor-active"
                : "text-editor-muted hover:text-editor-text hover:bg-editor-hover"
            }`}
            onClick={() => onSelectTab(tab.id)}
          >
            <span className="truncate max-w-[120px]">{tab.name}</span>
            {tab.isDirty && <span className="text-editor-active">●</span>}
            <button
              className="ml-1 opacity-0 group-hover:opacity-100 hover:bg-editor-hover rounded p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Monaco Editor container */}
      <div ref={containerRef} className="flex-1" />
    </div>
  );
}
