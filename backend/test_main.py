from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import asyncio

# Import the AI service directly
from backend.services.ai_service import AIService

app = FastAPI(
    title="Jarvis Coder Test API",
    description="Test backend for Jarvis Coder IDE with local LLMs",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI service
ai_service = AIService()

@app.get("/")
async def read_root():
    return {"message": "Welcome to Jarvis Coder Test API"}

@app.post("/api/chat")
async def chat_endpoint(request: Request):
    data = await request.json()
    message = data.get('message')
    model = data.get('model', 'mistral')  # Default to mistral for local testing
    
    if not message:
        return {"error": "Message is required"}
    
    async def generate():
        async for chunk in ai_service.generate_response(message, model=model):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

@app.get("/api/models")
async def get_models():
    """Get available models for testing"""
    return {
        "models": [
            "mistral",
            "gpt-oss:20b", 
            "deepseek-coder",
            "gpt-4o-mini",
            "claude-3-haiku"
        ],
        "default": "mistral"
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Jarvis Coder Test Server for local LLM testing...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
