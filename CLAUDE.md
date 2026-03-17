# CTT Code — AI-Powered Code Editor

## What is this
A desktop code editor/IDE like VS Code or Cursor, built on Electrobun (Bun + native webview) with ctt-shell as the AI agent backend for code generation, search, and autonomous task execution.

## Architecture
- **Desktop Framework**: Electrobun (Bun runtime + system native webview)
- **AI Backend**: ctt-shell via MCP protocol (JSON-RPC 2.0 over stdio)
- **UI**: React 18 + Tailwind CSS + Monaco Editor + xterm.js
- **Build**: Vite for webview bundling, Electrobun for native packaging

## Project structure
```
src/
  bun/              → Main process (Bun runtime, native APIs)
    index.ts        → App entry: window, RPC, file system, git, terminal
    ctt-bridge.ts   → MCP client: spawns ctt-shell, sends JSON-RPC
  shared/           → Shared types between main ↔ webview
    types.ts        → RPC schema, file/git/AI/terminal types
  mainview/         → Webview (React app rendered in native webview)
    App.tsx         → Root layout: sidebar, editor, AI panel, terminal
    main.tsx        → React entry point
    index.html      → HTML shell
    index.css       → Tailwind + custom styles
    types.ts        → Frontend-only types
    components/
      TitleBar.tsx  → Custom titlebar with toggle buttons
      Sidebar.tsx   → File explorer tree + search
      EditorPane.tsx→ Monaco Editor with tabs
      AiPanel.tsx   → AI chat panel (chat/execute/search modes)
      TerminalPanel.tsx → Integrated terminal (xterm.js + PTY)
      StatusBar.tsx → Bottom status bar
```

## Commands
```bash
bun install                  # Install dependencies
bun run dev                  # Electrobun dev mode
bun run dev:hmr              # Dev with Vite HMR
bun run start                # Build + run
bun run build:canary         # Build distributable
```

## Data flow
```
User Input (webview)
  ↓ Electrobun typed RPC
Main Process (Bun)
  ├── File System (Bun.file, readdir, etc.)
  ├── Git (spawn git CLI)
  ├── Terminal (bun-pty → PTY)
  └── CTT Bridge (MCP over stdio)
        ↓ JSON-RPC 2.0
      ctt-shell subprocess
        ├── ctt_chat / ctt_recall
        ├── ctt_execute (autonomous pipeline)
        ├── ctt_search (TF-IDF)
        ├── ctt_shell (RBAC commands)
        └── ctt_context (knowledge base)
```

## Environment variables
- `ANTHROPIC_API_KEY` — for Claude LLM (via ctt-shell)
- `OPENAI_API_KEY` — for OpenAI LLM (via ctt-shell)
- `CF_API_KEY` + `CF_ACCOUNT_ID` — for Cloudflare Workers AI (via ctt-shell)

## Key dependencies
- **electrobun** — Desktop framework (Bun + native webview)
- **monaco-editor** — Code editor (same as VS Code)
- **@xterm/xterm** — Terminal emulator
- **react** + **tailwindcss** — UI framework
- **ctt-shell** — AI agent backend (sibling repo)

## Design principles
- Zero runtime AI dependencies in the IDE — all AI via ctt-shell MCP
- Typed RPC everywhere (main ↔ webview)
- Catppuccin Mocha color theme
- Fast startup, small bundle (~12MB + ctt-shell)
