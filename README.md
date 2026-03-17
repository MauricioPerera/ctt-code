# ⚡ CTT Code

**AI-powered code editor built on Electrobun + ctt-shell**

A desktop IDE like VS Code or Cursor, with integrated AI agents that understand your codebase and can autonomously execute complex tasks.

## Features

- **Monaco Editor** — Same editor engine as VS Code with syntax highlighting, IntelliSense, and multi-tab editing
- **AI Chat Panel** — Chat, execute goals, and search across knowledge/skills/patterns
- **Integrated Terminal** — Full PTY-based terminal with xterm.js
- **File Explorer** — Tree view with search, supporting any project
- **Git Integration** — Branch info, status, powered by ctt-shell git domain
- **Autonomous AI** — Full recall → plan → execute → learn pipeline via ctt-shell
- **Cross-platform** — macOS, Windows 11+, Linux (via Electrobun)
- **Tiny & Fast** — ~12MB bundle, <50ms startup

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    CTT Code                           │
├──────────────┬───────────────────┬───────────────────┤
│   Sidebar    │   Monaco Editor   │    AI Panel       │
│  (file tree) │   (multi-tab)     │  (chat/exec/srch) │
│              │                   │                    │
│              ├───────────────────┤                    │
│              │    Terminal        │                    │
│              │   (xterm.js)      │                    │
├──────────────┴───────────────────┴───────────────────┤
│                 Electrobun RPC                        │
├──────────────────────────────────────────────────────┤
│              Main Process (Bun)                       │
│  ┌─────────┐ ┌─────────┐ ┌──────┐ ┌──────────────┐  │
│  │  Files  │ │   Git   │ │ PTY  │ │  CTT Bridge  │  │
│  └─────────┘ └─────────┘ └──────┘ └──────┬───────┘  │
│                                           │          │
│                              MCP (JSON-RPC 2.0)      │
│                                           │          │
│                                    ┌──────┴───────┐  │
│                                    │  ctt-shell   │  │
│                                    │  (8 tools)   │  │
│                                    └──────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- [Bun](https://bun.sh) runtime
- [ctt-shell](https://github.com/MauricioPerera/ctt-shell) (sibling directory or npm install)
- An LLM API key (Anthropic, OpenAI, or Cloudflare)

### Setup

```bash
# Clone
git clone https://github.com/MauricioPerera/ctt-code.git
cd ctt-code

# Install
bun install

# Configure AI (choose one)
export ANTHROPIC_API_KEY=sk-ant-...
# or
export OPENAI_API_KEY=sk-...
# or
export CF_API_KEY=... && export CF_ACCOUNT_ID=...

# Run
bun run dev:hmr
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electrobun (Bun + native webview) |
| Editor | Monaco Editor |
| Terminal | xterm.js + bun-pty |
| UI | React 18 + Tailwind CSS |
| AI | ctt-shell (MCP protocol) |
| Build | Vite + Electrobun CLI |
| Theme | Catppuccin Mocha |

## AI Capabilities (via ctt-shell)

| Tool | Description |
|------|-------------|
| `ctt_chat` | Contextual chat with TF-IDF recall |
| `ctt_execute` | Autonomous: recall → plan → execute → learn |
| `ctt_search` | Search across knowledge, skills, patterns |
| `ctt_shell` | Run shell commands with RBAC |
| `ctt_context` | Manage business knowledge base |
| `ctt_extract` | Extract domain knowledge |
| `ctt_list_domains` | List available domain adapters |
| `ctt_recall` | Build LLM context for a goal |

## License

MIT
