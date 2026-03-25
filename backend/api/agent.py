from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.services.agent_service import agent_service
import json
import asyncio
import gc

router = APIRouter()

class AgentTaskRequest(BaseModel):
    task: str
    active_file_path: Optional[str] = None
    max_iterations: int = 3

@router.post("/solve")
async def solve_task(request: AgentTaskRequest):
    """Solve a complex task using an iterative agent loop."""
    try:
        result = await agent_service.solve_with_loop(
            request.task, 
            active_file=request.active_file_path,
            max_iterations=request.max_iterations
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/ws")
async def agent_websocket(websocket: WebSocket):
    """WebSocket for real-time agent progress updates."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            request_data = json.loads(data)
            
            task = request_data.get("task")
            active_file = request_data.get("active_file_path")
            max_iterations = request_data.get("max_iterations", 3)
            
            if not task:
                await websocket.send_text(json.dumps({"type": "error", "message": "No task provided"}))
                continue

            # Progress callback for the agent loop
            async def progress_callback(update_type: str, payload: Any):
                await websocket.send_text(json.dumps({
                    "type": update_type,
                    "payload": payload
                }))

            # Run the agent loop
            result = await agent_service.solve_with_loop(
                task,
                active_file=active_file,
                max_iterations=max_iterations,
                progress_callback=progress_callback
            )
            
            await websocket.send_text(json.dumps({
                "type": "result",
                "payload": result
            }))
            
            # Aggressive GC after an iteration
            gc.collect()
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
    finally:
        try:
            await websocket.close()
        except:
            pass
