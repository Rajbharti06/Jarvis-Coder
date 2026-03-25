from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import StreamingResponse
from typing import List, Optional
from pydantic import BaseModel
from backend.services.command_processor import command_processor
from backend.services.conversation_service import conversation_service
from backend.db.session import SessionLocal
import json

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = None
    stream: bool = True
    active_file_path: Optional[str] = None
    conversation_id: Optional[int] = None

@router.post("/completions")
async def chat_completions(request: ChatRequest):
    """Generate chat completions, optionally streaming, with command support."""
    try:
        db = SessionLocal()
        
        # Determine or create conversation
        if request.conversation_id:
            conv = conversation_service.get_conversation(db, request.conversation_id)
            if not conv:
                conv = conversation_service.create_conversation(db, "Chat Context")
        else:
            conv = conversation_service.create_conversation(db, request.message[:30] + "..." if len(request.message) > 30 else request.message)
            
        conv_id = conv.id
        
        # Add user message
        conversation_service.add_message(db, conv_id, "user", request.message, request.model)
        
        # Get history for context
        history_msgs = conversation_service.get_messages(db, conv_id, limit=10)
        # Format for context
        history = [{"role": m.role, "content": m.content} for m in history_msgs[:-1]] # exclude the one we just added
        
        if request.stream:
            async def event_generator():
                response_content = ""
                # Yield conversation_id first so frontend can update URL / State
                yield f"data: {json.dumps({'conversation_id': conv_id})}\n\n"
                
                async for chunk in command_processor.process_command(
                    request.message, 
                    model=request.model, 
                    active_file_path=request.active_file_path,
                    conversation_history=history
                ):
                    response_content += chunk
                    yield f"data: {json.dumps({'content': chunk, 'conversation_id': conv_id})}\n\n"
                
                # Save assistant response
                conversation_service.add_message(db, conv_id, "assistant", response_content, request.model)
                yield "data: [DONE]\n\n"

            return StreamingResponse(event_generator(), media_type="text/event-stream")
        else:
            response_content = ""
            async for chunk in command_processor.process_command(
                request.message, 
                model=request.model, 
                active_file_path=request.active_file_path,
                conversation_history=history
            ):
                response_content += chunk
                
            # Save assistant response
            conversation_service.add_message(db, conv_id, "assistant", response_content, request.model)
            return {"content": response_content, "conversation_id": conv_id}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'db' in locals():
            db.close()
