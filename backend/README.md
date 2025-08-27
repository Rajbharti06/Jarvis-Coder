# Jarvis Coder - Backend

This is the backend for the Jarvis Coder IDE, built with FastAPI.

## Features

- **LLM Integration:** Supports local Ollama models and external API providers (OpenAI, Anthropic, Gemini, etc.).
- **Real-time Streaming:** Streams responses for a live, interactive experience.
- **Project Management:** Allows users to manage their projects and files.
- **Secure:** Encrypts user API keys and uses JWT for authentication.
- **Modular Architecture:** Designed for extensibility and maintainability.

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd jarvis-coder/backend
    ```

2.  **Create a virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure your environment:**
    -   Copy the `.env.example` file to `.env`:
        ```bash
        cp .env.example .env
        ```
    -   Edit the `.env` file to add your database URL, secrets, and any API keys.
        -   Generate a strong `ENCRYPTION_SECRET` and `JWT_SECRET_KEY`.

5.  **Run database migrations (if applicable):**
    ```bash
    # This step will be added once Alembic is configured.
    ```

6.  **Start the server:**
    ```bash
    uvicorn backend.main:app --reload
    ```

The API will be available at `http://127.0.0.1:8000` and the OpenAPI documentation at `http://127.0.0.1:8000/docs`.