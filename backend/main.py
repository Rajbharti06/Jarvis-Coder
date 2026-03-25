import logging
import psutil
import os
import gc
import time
from fastapi import FastAPI, Request
from starlette.middleware.cors import CORSMiddleware

# Import your API routers here
from backend.api import auth, files, chat, execute, models, autocomplete, editor, search, plugins, agent, system, git #, keys, projects
from backend.db.base import Base
from backend.db.session import engine

# Make sure models are imported before creating tables
import backend.models.conversation

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

    @application.middleware("http")
    async def memory_profiler_and_gc(request: Request, call_next):
        process = psutil.Process(os.getpid())
        mem_before = process.memory_info().rss / (1024 * 1024)
        
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        mem_after = process.memory_info().rss / (1024 * 1024)
        log.info(f"{request.method} {request.url.path} - Time: {process_time:.3f}s - Mem: {mem_after:.2f}MB (Delta: {mem_after - mem_before:+.2f}MB)")
        
        # Aggressive GC for low-RAM machines
        if mem_after > 500: # If process exceeds 500MB
            gc.collect()
            log.info(f"Triggered GC. Memory after: {process.memory_info().rss / (1024 * 1024):.2f}MB")
            
        return response
    # Include your API routers here
    application.include_router(auth.router, prefix="/auth", tags=["auth"])
    application.include_router(files.router, prefix="/api/files", tags=["files"])
    application.include_router(chat.router, prefix="/api/chat", tags=["chat"])
    application.include_router(execute.router, prefix="/api/execute", tags=["execute"])
    application.include_router(models.router, prefix="/api/models", tags=["models"])
    application.include_router(autocomplete.router, prefix="/api/autocomplete", tags=["autocomplete"])
    application.include_router(editor.router, prefix="/api/editor", tags=["editor"])
    application.include_router(search.router, prefix="/api/search", tags=["search"])
    application.include_router(plugins.router, prefix="/api/plugins", tags=["plugins"])
    application.include_router(agent.router, prefix="/api/agent", tags=["agent"])
    application.include_router(git.router, prefix="/api/git", tags=["git"])
    application.include_router(system.router, prefix="/api/system", tags=["system"])
    # application.include_router(models.router, prefix="/models", tags=["models"])
    # application.include_router(models.router, prefix="/models", tags=["models"])
    # application.include_router(keys.router, prefix="/keys", tags=["keys"])
    # application.include_router(projects.router, prefix="/projects", tags=["projects"])

    @application.get("/", tags=["Root"])
    async def read_root():
        return {"message": "Welcome to the Jarvis Coder API!"}

    return application

app = create_application()

if __name__ == "__main__":
    import uvicorn
    log.info("Starting Jarvis Coder backend...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
