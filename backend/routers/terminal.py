"""
Terminal router for Jarvis Terminal.
Handles command execution, terminal management, and safety measures.
"""

import os
import asyncio
import subprocess
import json
import uuid
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import logging
import shlex
import platform
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter(tags=["terminal"])

class CommandRequest(BaseModel):
    command: str
    cwd: Optional[str] = None
    env: Optional[Dict[str, str]] = None
    timeout: Optional[int] = 30

class CommandResponse(BaseModel):
    success: bool
    stdout: str
    stderr: str
    exit_code: int
    execution_time: float
    command_id: str
    cwd: Optional[str] = None

class TerminalSession(BaseModel):
    session_id: str
    cwd: str
    env: Dict[str, str]
    history: List[Dict[str, Any]]
    created_at: float

class TerminalManager:
    """Manages terminal sessions and command execution."""
    
    def __init__(self):
        self.sessions: Dict[str, TerminalSession] = {}
        self.active_processes: Dict[str, subprocess.Popen] = {}
        base_dir = Path(__file__).resolve().parents[2]
        self.workspace_dir = (base_dir / "workspace").resolve()
        self.sessions_file = (self.workspace_dir / "terminal_sessions.json").resolve()
        
        # Dangerous commands that should be blocked or require confirmation
        self.dangerous_commands = {
            'rm', 'del', 'rmdir', 'format', 'fdisk', 'mkfs',
            'dd', 'shutdown', 'reboot', 'halt', 'poweroff',
            'sudo rm', 'sudo dd', 'sudo mkfs', 'sudo fdisk'
        }
        
        # Commands that are generally safe
        self.safe_commands = {
            'ls', 'dir', 'pwd', 'cd', 'cat', 'type', 'echo',
            'grep', 'find', 'which', 'where', 'ps', 'top',
            'git', 'npm', 'pip', 'python', 'node', 'code',
            'curl', 'wget', 'ping', 'tracert', 'nslookup'
        }
        try:
            self._load_sessions()
        except Exception as e:
            logger.warning(f"Failed to load terminal sessions: {e}")
    
    def _persist_sessions(self) -> None:
        """Persist sessions to workspace JSON."""
        try:
            self.workspace_dir.mkdir(parents=True, exist_ok=True)
            serializable = {
                sid: {
                    "session_id": s.session_id,
                    "cwd": s.cwd,
                    "env": {},  # do not persist env to avoid leaking secrets
                    "history": s.history[-100],  # cap history
                    "created_at": s.created_at
                }
                for sid, s in self.sessions.items()
            }
            self.sessions_file.write_text(json.dumps(serializable, indent=2))
        except Exception as e:
            logger.error(f"Failed to persist terminal sessions: {e}")
    
    def _load_sessions(self) -> None:
        """Load sessions from workspace JSON."""
        if not self.sessions_file.exists():
            return
        data = json.loads(self.sessions_file.read_text(encoding="utf-8"))
        for sid, s in data.items():
            self.sessions[sid] = TerminalSession(
                session_id=s.get("session_id", sid),
                cwd=s.get("cwd", os.getcwd()),
                env=dict(os.environ),
                history=s.get("history", []),
                created_at=s.get("created_at", asyncio.get_event_loop().time())
            )
    
    def create_session(self, cwd: Optional[str] = None) -> str:
        """Create a new terminal session."""
        session_id = str(uuid.uuid4())
        
        if cwd is None:
            cwd = os.getcwd()
        elif not os.path.exists(cwd):
            cwd = os.getcwd()
        
        session = TerminalSession(
            session_id=session_id,
            cwd=cwd,
            env=dict(os.environ),
            history=[],
            created_at=asyncio.get_event_loop().time()
        )
        
        self.sessions[session_id] = session
        logger.info(f"Created terminal session {session_id} in {cwd}")
        self._persist_sessions()
        return session_id
    
    def get_session(self, session_id: str) -> Optional[TerminalSession]:
        """Get terminal session by ID."""
        return self.sessions.get(session_id)
    
    def list_sessions(self) -> List[Dict[str, Any]]:
        """List available sessions."""
        return [
            {
                "session_id": s.session_id,
                "cwd": s.cwd,
                "history_count": len(s.history),
                "created_at": s.created_at
            }
            for s in self.sessions.values()
        ]
    
    def rename_session(self, session_id: str, name: str) -> bool:
        """Rename session by setting a friendly name in cwd (metadata-only)."""
        session = self.get_session(session_id)
        if not session:
            return False
        # Store friendly name in history metadata for simplicity
        session.history.append({"meta": "rename", "name": name, "timestamp": asyncio.get_event_loop().time()})
        self._persist_sessions()
        return True
    
    def is_command_safe(self, command: str) -> tuple[bool, str]:
        """
        Check if a command is safe to execute.
        
        Returns:
            tuple: (is_safe, reason)
        """
        command_lower = command.lower().strip()
        
        # Check for dangerous commands
        for dangerous in self.dangerous_commands:
            if command_lower.startswith(dangerous):
                return False, f"Dangerous command detected: {dangerous}"
        
        # Check for suspicious patterns
        suspicious_patterns = [
            '> /dev/', '> nul', 'format c:', 'del /s', 'rm -rf /',
            'sudo su', 'chmod 777', 'chown root'
        ]
        
        for pattern in suspicious_patterns:
            if pattern in command_lower:
                return False, f"Suspicious pattern detected: {pattern}"
        
        return True, "Command appears safe"
    
    async def execute_command(
        self,
        command: str,
        session_id: Optional[str] = None,
        cwd: Optional[str] = None,
        env: Optional[Dict[str, str]] = None,
        timeout: int = 30
    ) -> CommandResponse:
        """Execute a command safely."""
        command_id = str(uuid.uuid4())
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Get or create session
            if session_id:
                session = self.get_session(session_id)
                if not session:
                    raise HTTPException(status_code=404, detail="Session not found")
            else:
                session_id = self.create_session(cwd)
                session = self.get_session(session_id)
            
            # Use session's cwd and env if not provided
            if cwd is None:
                cwd = session.cwd
            if env is None:
                env = session.env.copy()
            
            # Safety check
            is_safe, reason = self.is_command_safe(command)
            if not is_safe:
                logger.warning(f"Blocked unsafe command: {command} - {reason}")
                return CommandResponse(
                    success=False,
                    stdout="",
                    stderr=f"Command blocked for safety: {reason}",
                    exit_code=-1,
                    execution_time=0.0,
                    command_id=command_id
                )
            
            # Prepare command for execution
            if platform.system() == "Windows":
                # Use PowerShell on Windows
                full_command = ["powershell", "-Command", command]
            else:
                # Use bash on Unix-like systems
                full_command = ["bash", "-c", command]
            
            # Execute command
            def _run_blocking():
                try:
                    result = subprocess.run(
                        full_command,
                        cwd=cwd,
                        env=env,
                        capture_output=True,
                        text=True,
                        timeout=timeout,
                        encoding='utf-8',
                        errors='replace'
                    )
                    return result.stdout, result.stderr, result.returncode
                except subprocess.TimeoutExpired:
                    return "", "Command timed out", -1
                except Exception as e:
                    return "", str(e), -1

            stdout_str, stderr_str, exit_code = await asyncio.to_thread(_run_blocking)
            
            execution_time = asyncio.get_event_loop().time() - start_time
            
            # Update session history
            session.history.append({
                "command": command,
                "stdout": stdout_str,
                "stderr": stderr_str,
                "exit_code": exit_code,
                "execution_time": execution_time,
                "timestamp": start_time,
                "command_id": command_id
            })
            
            # Update session cwd if command was 'cd'
            if command.strip().startswith('cd ') and exit_code == 0:
                try:
                    new_cwd = command.strip()[3:].strip()
                    if new_cwd:
                        if os.path.isabs(new_cwd):
                            session.cwd = new_cwd
                        else:
                            session.cwd = os.path.join(session.cwd, new_cwd)
                        session.cwd = os.path.abspath(session.cwd)
                except Exception as e:
                    logger.warning(f"Failed to update cwd: {e}")
            
            # Persist after each command
            self._persist_sessions()
            
            return CommandResponse(
                success=exit_code == 0,
                stdout=stdout_str,
                stderr=stderr_str,
                exit_code=exit_code,
                execution_time=execution_time,
                command_id=command_id,
                cwd=session.cwd
            )
            
        except Exception as e:
            execution_time = asyncio.get_event_loop().time() - start_time
            logger.error(f"Command execution failed: {e}")
            import traceback
            traceback.print_exc()
            
            return CommandResponse(
                success=False,
                stdout="",
                stderr=f"Execution error: {repr(e)}",
                exit_code=-1,
                execution_time=execution_time,
                command_id=command_id,
                cwd=session.cwd if session else cwd
            )
    
    def kill_command(self, command_id: str) -> bool:
        """Kill a running command."""
        process = self.active_processes.get(command_id)
        if process:
            try:
                process.kill()
                self.active_processes.pop(command_id, None)
                return True
            except Exception as e:
                logger.error(f"Failed to kill command {command_id}: {e}")
        return False
    
    def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session information."""
        session = self.get_session(session_id)
        if not session:
            return None
        
        return {
            "session_id": session.session_id,
            "cwd": session.cwd,
            "history_count": len(session.history),
            "created_at": session.created_at,
            "recent_commands": [
                {
                    "command": cmd["command"],
                    "exit_code": cmd["exit_code"],
                    "timestamp": cmd["timestamp"]
                }
                for cmd in session.history[-10:]  # Last 10 commands
            ]
        }

# Global terminal manager
terminal_manager = TerminalManager()

@router.post("/execute", response_model=CommandResponse)
async def execute_command(request: CommandRequest):
    """Execute a terminal command."""
    return await terminal_manager.execute_command(
        command=request.command,
        cwd=request.cwd,
        env=request.env,
        timeout=request.timeout or 30
    )

@router.post("/sessions", response_model=Dict[str, str])
async def create_session(cwd: Optional[str] = None):
    """Create a new terminal session."""
    session_id = terminal_manager.create_session(cwd)
    return {"session_id": session_id}

@router.get("/sessions")
async def list_sessions():
    """List terminal sessions."""
    return terminal_manager.list_sessions()

@router.get("/sessions/{session_id}")
async def get_session_info(session_id: str):
    """Get session information."""
    info = terminal_manager.get_session_info(session_id)
    if not info:
        raise HTTPException(status_code=404, detail="Session not found")
    return info

class RenameRequest(BaseModel):
    name: str

@router.post("/sessions/{session_id}/rename")
async def rename_session(session_id: str, request: RenameRequest):
    """Rename a terminal session."""
    success = terminal_manager.rename_session(session_id, request.name)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session renamed", "session_id": session_id, "name": request.name}

@router.post("/sessions/{session_id}/execute", response_model=CommandResponse)
async def execute_command_in_session(session_id: str, request: CommandRequest):
    """Execute a command in a specific session."""
    return await terminal_manager.execute_command(
        command=request.command,
        session_id=session_id,
        cwd=request.cwd,
        env=request.env,
        timeout=request.timeout or 30
    )

@router.delete("/commands/{command_id}")
async def kill_command(command_id: str):
    """Kill a running command."""
    success = terminal_manager.kill_command(command_id)
    if not success:
        raise HTTPException(status_code=404, detail="Command not found or already finished")
    return {"message": "Command killed successfully"}

@router.websocket("/ws/{session_id}")
async def terminal_websocket(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time terminal interaction."""
    await websocket.accept()
    
    # Get or create session
    session = terminal_manager.get_session(session_id)
    if not session:
        session_id = terminal_manager.create_session()
        session = terminal_manager.get_session(session_id)
    
    try:
        while True:
            # Receive command from client
            data = await websocket.receive_text()
            command_data = json.loads(data)
            
            command = command_data.get("command", "")
            if not command:
                continue
            
            # Execute command
            result = await terminal_manager.execute_command(
                command=command,
                session_id=session_id,
                timeout=command_data.get("timeout", 30)
            )
            
            # Send result back to client
            await websocket.send_text(json.dumps({
                "type": "command_result",
                "data": result.dict()
            }))
            
            # Send session info
            session_info = terminal_manager.get_session_info(session_id)
            await websocket.send_text(json.dumps({
                "type": "session_info",
                "data": session_info
            }))
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close()

@router.websocket("/collab/{room_id}")
async def collab_websocket(websocket: WebSocket, room_id: str):
    """Simple collaboration WebSocket: broadcast JSON messages to all peers in a room."""
    await websocket.accept()
    if not hasattr(collab_websocket, "rooms"):
        collab_websocket.rooms = {}  # type: ignore
    room = collab_websocket.rooms.setdefault(room_id, set())  # type: ignore
    room.add(websocket)
    try:
        while True:
            message = await websocket.receive_text()
            for peer in list(room):
                if peer is not websocket:
                    try:
                        await peer.send_text(message)
                    except Exception:
                        room.discard(peer)
    except WebSocketDisconnect:
        room.discard(websocket)
    except Exception as e:
        logger.error(f"Collab WS error in room {room_id}: {e}")
        await websocket.close()

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "active_sessions": len(terminal_manager.sessions),
        "active_processes": len(terminal_manager.active_processes)
    }
