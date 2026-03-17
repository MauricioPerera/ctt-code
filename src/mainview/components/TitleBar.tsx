import React from "react";

type Props = {
  projectName: string;
  onToggleSidebar: () => void;
  onToggleAi: () => void;
  onToggleTerminal: () => void;
};

export function TitleBar({ projectName, onToggleSidebar, onToggleAi, onToggleTerminal }: Props) {
  return (
    <div className="drag-region flex items-center h-10 bg-editor-panel border-b border-editor-border px-4 select-none">
      {/* macOS traffic light spacing */}
      <div className="w-[70px] flex-shrink-0" />

      {/* Toggle buttons */}
      <div className="no-drag flex items-center gap-1 mr-4">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded hover:bg-editor-hover text-editor-muted hover:text-editor-text transition-colors"
          title="Toggle Sidebar (⌘B)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <rect x="6" y="2" width="9" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>

      {/* Project name centered */}
      <div className="flex-1 text-center">
        <span className="text-sm font-medium text-editor-muted">{projectName}</span>
      </div>

      {/* Right side toggles */}
      <div className="no-drag flex items-center gap-1">
        <button
          onClick={onToggleTerminal}
          className="p-1.5 rounded hover:bg-editor-hover text-editor-muted hover:text-editor-text transition-colors"
          title="Toggle Terminal (⌘`)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button
          onClick={onToggleAi}
          className="p-1.5 rounded hover:bg-editor-hover text-editor-muted hover:text-editor-text transition-colors"
          title="Toggle AI Panel (⌘⇧A)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L2 8l6 6 6-6-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="8" cy="8" r="2" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
}
