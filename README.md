# 🤖 Jarvis Coder — Your AI-Powered Development Partner

> **Built like the old terminals. Powered like the future.**
> Jarvis Coder is an AI-powered development environment that brings together a code editor, terminal, workspace, and intelligent assistant — all in one focused system.

Not a toy. Not a wrapper.
A serious environment for developers who want **control, speed, and intelligence** — online or offline.

---

## 🧭 What is Jarvis Coder?

**Jarvis Coder** is a full-stack **AI Development Environment (ADE)** designed to feel like a real engineer’s workspace.

It combines:

* a powerful code editor
* an interactive terminal
* project & workspace management
* and an AI assistant that understands *how developers actually work*

Think of it as:

* 🧠 an **AI pair programmer**
* 🧰 a **local-first coding lab**
* ⌨️ a **terminal lover’s IDE**
* 🛠️ a **builder’s control room**

---

## ✨ Core Philosophy

* **Offline-first matters** — intelligence should run on your machine
* **The terminal is sacred** — GUIs assist, they don’t replace
* **AI should obey you** — not lock you into clouds
* **Productivity over polish** — signal > noise
* **Classic workflows still win** — editors, shells, files

Jarvis Coder is built for people who *ship*, not just click.

---

## 🚀 Features

### 🧠 AI-Powered Assistance

* 🔁 **Dual-mode AI** — Online (OpenAI) or Offline (Ollama)
* 🧬 **Auto provider selection** — picks the best available AI
* 🗣️ **Natural language commands** for code, fixes & explanations
* 🌊 **Streaming responses** with real-time typing

---

### 🧑‍💻 Development Environment

* ✍️ **Monaco Editor** with syntax highlighting & IntelliSense
* 🪟 **Split-view layout** — editor + terminal side by side
* 🗂️ **File Explorer** for workspace navigation
* ▶️ **Run code directly** (Python, JS, shell)
* 🧩 **Project templates**:

  * React
  * Next.js
  * Django
  * FastAPI
  * and more

---

### ⌨️ Command Line Interface

* 🧪 **Interactive REPL** with autocomplete
* 🎨 **Rich terminal output** (formatted & highlighted)
* 🔗 **Deep workspace integration**
* 🤖 **AI commands inside CLI**

---

### 🔐 Security & Reliability

* 🛡️ **Secure logging** — prevents code leaks
* 🧯 **Graceful error handling**
* ⚙️ **Environment-based configuration**
* 🧩 Modular service architecture

---

## 🛠️ Installation

### Prerequisites

* Python 3.8+
* Node.js 14+
* Ollama (for offline AI)
* OpenAI API key (optional, for online AI)

---

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

---

### Frontend Setup

```bash
cd frontend
npm install
```

---

### CLI Setup

```bash
cd cli
pip install -r requirements.txt
```

---

## ⚙️ Configuration

Create a `.env` file inside `backend/`:

```env
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:8000

AI_MODE=auto  # auto | online | offline
OPENAI_API_KEY=your_key_here
OLLAMA_MODEL=gpt-oss:20b

WORKSPACE_DIR=./workspace
LOG_LEVEL=INFO
```

---

## 🚀 Usage

### Start Backend

```bash
cd backend
python main.py
```

### Start Frontend

```bash
cd frontend
npm start
```

### Use CLI

```bash
cd cli
python jarvis_cli.py
```

---

## 📋 Commands Overview

### 🤖 AI Commands

* `/chat [message]` — chat with Jarvis
* `/code [desc]` — generate code
* `/explain [code]` — explain logic
* `/fix [code]` — debug & fix
* `/templates` — list templates

---

### 📂 File Operations

* `/save [file] [code]`
* `/files`
* `/read [file]`

---

### 🏗️ Project Management

* `/new [type] [name]`
* `/run [command]`
* `/git [command]`
* `/deploy`

---

## 🏗️ Project Structure

```
jarvis-coder/
├── backend/
│   ├── api/
│   ├── services/
│   ├── config.py
│   └── main.py
├── frontend/
│   └── src/
├── cli/
│   └── jarvis_cli.py
└── workspace/
```

---

## 🔧 API Endpoints

* `POST /api/chat`
* `POST /api/chat/stream`
* `GET /api/files`
* `POST /api/execute`

---

## 🛣️ Roadmap

* 🧠 Context-aware long-term memory
* 🎙️ Voice-driven coding (talk to Jarvis)
* 🔌 Plugin ecosystem
* 🧩 Language-specific AI agents
* 🖥️ Terminal-only ADE mode
* 🌐 Remote workspace support

---

## 🤍 Who This Is For

* Developers who love terminals
* Builders on low-resource machines
* Engineers who want offline AI
* Students learning real workflows

---

## 📜 License

MIT License

---

## 🌌 Final Note

Jarvis Coder isn’t trying to replace you.

It’s here to:

* reduce friction
* speed up thinking
* and keep you in flow

Classic tools. Modern intelligence.

Welcome to **Jarvis Coder**.
