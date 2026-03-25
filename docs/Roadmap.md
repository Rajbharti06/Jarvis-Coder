# Jarvis Coder: MVP Roadmap (5 Days)

This roadmap outlines the journey from a blank slate to a functional, "Cursor-like" local AI coding assistant.

## Day 1: The Foundation (Core Stack)
**Goal**: Get the backend and frontend talking.
- **Backend**: Set up FastAPI with basic health checks.
- **Frontend**: Initialize React + Tailwind.
- **Editor**: Integrate Monaco Editor with basic "open/save" functionality.
- **Why**: You can't have an AI assistant without a place to write and read code.

## Day 2: File Intelligence (Context)
**Goal**: Make the AI understand the codebase.
- **FS API**: Build endpoints to list, read, and search files locally.
- **Context Service**: Logic to extract "Project Structure" and "Active File" content.
- **RAG Lite**: Integrate ChromaDB for simple semantic search (finding code by meaning).
- **Why**: AI is only as good as the context you give it.

## Day 3: The Brain (Ollama & APIs)
**Goal**: Connect the models.
- **Ollama Integration**: Pull and run `codellama` or `deepseek-coder`.
- **Streaming**: Implement SSE (Server-Sent Events) for real-time AI responses.
- **Prompt Engineering**: System prompts for code generation, debugging, and explaining.
- **Why**: Developer flow depends on speed and real-time interaction.

## Day 4: Agentic Action (The Loop)
**Goal**: AI that actually edits code.
- **Search/Replace Parser**: AI generates specific edits, backend applies them.
- **Think-Act Loop**: The `/agent` endpoint that can run multiple iterations.
- **Terminal Integration**: Allow the agent to run `pytest` or `npm test` to verify its own work.
- **Why**: This is the difference between a "Chatbot" and an "AI Assistant".

## Day 5: Elite Developer Experience (DX)
**Goal**: Polish and performance.
- **GPU Terminal**: Integrate xterm.js with WebGL.
- **Commands**: Add `/fix`, `/explain`, and `/refactor` shortcuts.
- **Low-RAM Optimization**: Memory profiling and context window management.
- **Why**: Production tools must feel snappy and robust.
