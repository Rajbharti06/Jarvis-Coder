import asyncio
import os
import platform
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ptyprocess import PtyProcess

router = APIRouter()

@router.websocket("/ws")
async def websocket_terminal(websocket: WebSocket):
    """
    Handles the WebSocket connection for the integrated terminal.
    Spawns a pty process and relays data between the client and the pty.
    """
    await websocket.accept()

    # Determine the appropriate shell for the OS
    shell = 'powershell.exe' if platform.system() == "Windows" else 'bash'
    
    # Spawn the pseudo-terminal process
    pty = PtyProcess.spawn([shell], dimensions=(100, 30))

    async def read_from_pty_and_forward_to_ws():
        """Read from pty and forward to websocket client."""
        try:
            while True:
                await asyncio.sleep(0.01)
                data = pty.read(1024)
                if data:
                    await websocket.send_text(data.decode('utf-8', errors='ignore'))
        except WebSocketDisconnect:
            print("Client disconnected.")
        except Exception as e:
            print(f"PTY Read Error: {e}")
        finally:
            if pty.isalive():
                pty.terminate(force=True)

    async def read_from_ws_and_forward_to_pty(pty_process: PtyProcess):
        """Read from websocket and forward to pty."""
        try:
            while True:
                data = await websocket.receive_text()
                pty_process.write(data.encode('utf-8'))
        except WebSocketDisconnect:
            print("Client disconnected, closing PTY.")
        except Exception as e:
            print(f"WS Read Error: {e}")
        finally:
            if pty.isalive():
                pty.terminate(force=True)

    # Run both tasks concurrently
    pty_reader_task = asyncio.create_task(read_from_pty_and_forward_to_ws())
    ws_reader_task = asyncio.create_task(read_from_ws_and_forward_to_pty(pty))

    try:
        await asyncio.gather(pty_reader_task, ws_reader_task)
    except Exception as e:
        print(f"Terminal session error: {e}")
    finally:
        pty_reader_task.cancel()
        ws_reader_task.cancel()
        if pty.isalive():
            pty.terminate(force=True)
        print("Terminal session closed.")
