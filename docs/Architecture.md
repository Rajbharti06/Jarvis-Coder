# Jarvis Coder: System Architecture

## Overview
Jarvis Coder is a lightweight, offline-first AI coding assistant. It uses a decoupled architecture to ensure high performance on low-resource devices while providing a seamless "Cursor-like" experience.

## 1. High-Level Architecture
The system is divided into four main layers:

### A. The Face (Frontend - React + Monaco)
- **Editor**: Uses Microsoft's Monaco Editor for a VS Code-grade coding experience.
- **Terminal**: GPU-accelerated via `xterm.js` and WebGL for sub-50ms latency.
- **State Management**: Handled by `Zustand` for lightweight, reactive updates.
- **Communication**: Uses REST for file operations and Server-Sent Events (SSE) for AI streaming.

### B. The Nerve Center (Backend - FastAPI)
- **Orchestrator**: Manages the flow between the UI, the AI models, and the local file system.
- **Security Layer**: Ensures all operations (file writes, command execution) are restricted to the `workspace/` directory.
- **API Endpoints**: Clean, modular routers for `/files`, `/chat`, `/agent`, and `/execute`.

### C. The Brain (AI Engine - Ollama + Cloud APIs)
- **Local (Ollama)**: Primary engine for privacy and offline use. Optimized for models like `DeepSeek-Coder` or `Phi-3`.
- **Hybrid Router**: Automatically switches between local and cloud providers based on configuration and model availability.
- **Context Injection**: A specialized service that gathers relevant codebase snippets to "feed" the LLM's short-term memory.

### D. The Hands (Execution & Search)
- **Agent Loop**: Implements a Think-Act-Observe loop. It can propose edits, apply them, run tests, and fix errors iteratively.
- **Semantic Search**: Powered by `ChromaDB` (local Vector DB) to provide project-wide intelligence without heavy indexing.

---

## 2. Core Vision: Why this works for low-RAM
1. **Lightweight Python Backend**: FastAPI has a very low baseline memory footprint (<50MB).
2. **On-Demand LLM**: Ollama only loads models into VRAM/RAM when needed and can be configured to offload layers.
3. **No Heavy Indexing**: Uses local RAG (Retrieval-Augmented Generation) with small embedding models (`all-MiniLM-L6-v2`) instead of massive background workers.
4. **Decoupled Terminal**: Terminal execution is separate from the UI thread, ensuring the editor never freezes.
