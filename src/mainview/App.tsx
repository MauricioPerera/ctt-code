import React, { useState, useCallback } from "react";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { EditorPane } from "./components/EditorPane";
import { AiPanel } from "./components/AiPanel";
import { TerminalPanel } from "./components/TerminalPanel";
import { StatusBar } from "./components/StatusBar";
import { rpc } from "./rpc";
import type { FileEntry } from "./types";

export type OpenTab = {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isDirty: boolean;
};

export default function App() {
  // Layout state
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [aiPanelVisible, setAiPanelVisible] = useState(true);
  const [terminalVisible, setTerminalVisible] = useState(false);

  // Project state
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("CTT Code");

  // Editor state
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // ── Project Management ─────────────────────────────────────────
  const handleOpenFolder = useCallback(async () => {
    try {
      const result = await rpc.request.openFolder({});
      if (result?.paths?.[0]) {
        const path = result.paths[0];
        setProjectPath(path);
        setProjectName(path.split("/").pop() ?? path.split("\\").pop() ?? "Project");
        setOpenTabs([]);
        setActiveTabId(null);
      }
    } catch (err) {
      console.error("Failed to open folder:", err);
    }
  }, []);

  // ── File Opening ───────────────────────────────────────────────
  const handleOpenFile = useCallback(
    async (file: FileEntry) => {
      if (file.isDirectory || !projectPath) return;

      // Check if already open
      const existing = openTabs.find((t) => t.path === file.path);
      if (existing) {
        setActiveTabId(existing.id);
        return;
      }

      try {
        const { content, language } = await rpc.request.readFile({
          projectPath,
          filePath: file.path,
        });

        const tab: OpenTab = {
          id: `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          path: file.path,
          content,
          language,
          isDirty: false,
        };

        setOpenTabs((prev) => [...prev, tab]);
        setActiveTabId(tab.id);
      } catch (err) {
        console.error("Failed to read file:", err);
      }
    },
    [projectPath, openTabs],
  );

  // ── Tab Management ─────────────────────────────────────────────
  const handleCloseTab = useCallback(
    (tabId: string) => {
      setOpenTabs((prev) => prev.filter((t) => t.id !== tabId));
      if (activeTabId === tabId) {
        setActiveTabId((prev) => {
          const remaining = openTabs.filter((t) => t.id !== tabId);
          return remaining.length > 0 ? remaining[remaining.length - 1].id : null;
        });
      }
    },
    [activeTabId, openTabs],
  );

  const handleTabContentChange = useCallback((tabId: string, content: string) => {
    setOpenTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, content, isDirty: true } : t)),
    );
  }, []);

  const handleSave = useCallback(
    async (tabId: string) => {
      const tab = openTabs.find((t) => t.id === tabId);
      if (!tab || !projectPath) return;

      try {
        await rpc.request.writeFile({
          projectPath,
          filePath: tab.path,
          content: tab.content,
        });
        setOpenTabs((prev) =>
          prev.map((t) => (t.id === tabId ? { ...t, isDirty: false } : t)),
        );
      } catch (err) {
        console.error("Failed to save:", err);
      }
    },
    [openTabs, projectPath],
  );

  const activeTab = openTabs.find((t) => t.id === activeTabId) ?? null;

  return (
    <div className="flex flex-col h-screen w-screen bg-editor-bg">
      {/* Title bar */}
      <TitleBar
        projectName={projectName}
        onToggleSidebar={() => setSidebarVisible((v) => !v)}
        onToggleAi={() => setAiPanelVisible((v) => !v)}
        onToggleTerminal={() => setTerminalVisible((v) => !v)}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarVisible && (
          <Sidebar
            projectPath={projectPath}
            onOpenFile={handleOpenFile}
            onOpenFolder={handleOpenFolder}
          />
        )}

        {/* Resize handle */}
        {sidebarVisible && <div className="resize-handle w-[2px] bg-editor-border" />}

        {/* Center: Editor + Terminal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor pane */}
          <EditorPane
            tabs={openTabs}
            activeTab={activeTab}
            onSelectTab={setActiveTabId}
            onCloseTab={handleCloseTab}
            onContentChange={handleTabContentChange}
            onSave={handleSave}
          />

          {/* Terminal */}
          {terminalVisible && (
            <>
              <div className="resize-handle h-[2px] bg-editor-border cursor-row-resize" />
              <TerminalPanel projectPath={projectPath} />
            </>
          )}
        </div>

        {/* AI Panel resize handle */}
        {aiPanelVisible && <div className="resize-handle w-[2px] bg-editor-border" />}

        {/* AI Panel */}
        {aiPanelVisible && (
          <AiPanel
            projectPath={projectPath}
            activeFile={activeTab?.path ?? null}
            onInsertCode={(code) => {
              if (activeTabId) {
                handleTabContentChange(activeTabId, (activeTab?.content ?? "") + "\n" + code);
              }
            }}
          />
        )}
      </div>

      {/* Status bar */}
      <StatusBar
        projectPath={projectPath}
        activeFile={activeTab?.path ?? null}
        language={activeTab?.language ?? null}
        isDirty={activeTab?.isDirty ?? false}
      />
    </div>
  );
}
