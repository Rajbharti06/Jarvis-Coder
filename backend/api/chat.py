from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator
import asyncio
import json

# Import AI service - for now we'll create a simple mock
# from backend.services.ai_service import ai_service

router = APIRouter()
connections = set()

# Simple mock AI service for testing
class MockAIService:
    async def generate_response(self, message: str, stream: bool = False):
        if stream:
            for word in f"Echo: {message}".split():
                yield word + " "
                await asyncio.sleep(0.1)
        else:
            yield f"Echo: {message}"

ai_service = MockAIService()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connections.add(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo message to all connected clients
            for connection in connections:
                if connection != websocket:
                    await connection.send_text(f"Message from client: {data}")
    except WebSocketDisconnect:
        connections.remove(websocket)

@router.post("/chat")
async def chat_endpoint(message: dict):
    """Handle chat messages and return LLM responses"""
    try:
        user_message = message.get("message", "")
        if not user_message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        # Get response from AI service
        response_content = ""
        async for chunk in ai_service.generate_response(user_message, stream=False):
            response_content += chunk
        
        return {"message": response_content}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing message: {str(e)}")

@router.post("/chat/stream")
async def chat_stream_endpoint(message: dict):
    """Stream chat responses from LLM"""
    user_message = message.get("message", "")
    if not user_message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            async for chunk in ai_service.generate_response(user_message, stream=True):
                yield f"data: {json.dumps({'content': chunk})}\n\n"
                await asyncio.sleep(0.01)  # Small delay to prevent overwhelming the client
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
