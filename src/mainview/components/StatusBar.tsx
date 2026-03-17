import React from "react";

type Props = {
  projectPath: string | null;
  activeFile: string | null;
  language: string | null;
  isDirty: boolean;
};

export function StatusBar({ projectPath, activeFile, language, isDirty }: Props) {
  return (
    <div className="flex items-center justify-between h-6 px-3 bg-editor-active/10 border-t border-editor-border text-xs select-none">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Branch indicator */}
        <span className="flex items-center gap-1 text-editor-muted">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path
              d="M5 3v6.5a3.5 3.5 0 007 0V3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="5" cy="3" r="1.5" fill="currentColor" />
            <circle cx="12" cy="3" r="1.5" fill="currentColor" />
            <circle cx="8.5" cy="12.5" r="1.5" fill="currentColor" />
          </svg>
          main
        </span>

        {/* CTT-Shell status */}
        <span className="flex items-center gap-1 text-editor-active">
          ⚡ CTT
        </span>

        {/* Dirty indicator */}
        {isDirty && <span className="text-yellow-400">● Unsaved</span>}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 text-editor-muted">
        {activeFile && <span>{activeFile}</span>}
        {language && (
          <span className="px-1.5 py-0.5 bg-editor-hover rounded text-editor-text">
            {language}
          </span>
        )}
        <span>UTF-8</span>
        <span>LF</span>
      </div>
    </div>
  );
}
