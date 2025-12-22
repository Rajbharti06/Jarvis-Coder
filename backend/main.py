import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from starlette.middleware.cors import CORSMiddleware

# Import your API routers here
from backend.api import auth, chat, execute, files, baseline, projects, trae_cursor_blackbox, models, keys, code_assistant
from backend.routers import terminal, context, offline
from backend.db.base import Base
from backend.db.session import engine

# Create database tables
Base.metadata.create_all(bind=engine)

# Configure logging
log = logging.getLogger("uvicorn")

def create_application() -> FastAPI:
    application = FastAPI(
        title="Jarvis Coder API",
        description="Backend for the Jarvis Coder IDE.",
        version="0.1.0",
    )
    # Add CORS middleware
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins for now, restrict in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # Include your API routers here
    application.include_router(auth.router, prefix="/auth", tags=["auth"])
    application.include_router(chat.router, prefix="/chat", tags=["chat"])
    application.include_router(execute.router, prefix="/execute", tags=["execute"])
    application.include_router(files.router, prefix="/files", tags=["files"])
    application.include_router(terminal.router, prefix="/terminal", tags=["terminal"])
    application.include_router(context.router, prefix="/context", tags=["context"])
    application.include_router(baseline.router, prefix="/baseline", tags=["baseline"])
    application.include_router(projects.router, prefix="/projects", tags=["projects"])
    application.include_router(trae_cursor_blackbox.router, prefix="/ai-assistant", tags=["ai-assistant"])
    application.include_router(offline.router, prefix="/offline", tags=["offline"])
    application.include_router(models.router, prefix="/api/models", tags=["models"])
    application.include_router(keys.router, prefix="/api/keys", tags=["keys"])
    # Code Assistant endpoints (prefixed under /api/ai for NGINX compatibility)
    application.include_router(code_assistant.router, prefix="/api/ai", tags=["ai"])

    @application.get("/", tags=["Root"])
    async def read_root():
        return {"message": "Welcome to the Jarvis Coder API!"}

    connections = set()

    @application.websocket("/ws")
    async def root_websocket(ws: WebSocket):
        await ws.accept()
        connections.add(ws)
        try:
            while True:
                data = await ws.receive_text()
                await ws.send_text(f"Message from client: {data}")
        except WebSocketDisconnect:
            connections.discard(ws)

    return application

app = create_application()

if __name__ == "__main__":
    import uvicorn
    log.info("Starting Jarvis Coder backend...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
