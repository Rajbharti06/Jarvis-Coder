import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

# Import your API routers here
from backend.api import auth, chat, execute, files, terminal #, models, keys, projects
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
