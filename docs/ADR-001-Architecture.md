# ADR 001: AI-Native Code Editor Architecture

## Status
Accepted

## Context
We need to build a production-grade, AI-native code editor that competes with Warp, Trae, and Cursor.

## Decision
We chose a modular architecture based on:
1. **Frontend**: React + Monaco Editor for the core. xterm.js with WebGL for GPU-accelerated terminal.
2. **Backend**: FastAPI for high-performance API. ChromaDB for semantic search. Ollama for local LLM execution.
3. **AI Integration**: Custom Monaco providers for inline generation (Cmd+K), hovers, and real-time diagnostics.
4. **Extensibility**: Python-based plugin SDK for dynamic hook execution.

## Consequences
- **Pros**: High performance, offline-first, easy to extend.
- **Cons**: Requires local resources (GPU/RAM) for LLMs.
