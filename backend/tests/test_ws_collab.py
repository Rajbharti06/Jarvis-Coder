from fastapi.testclient import TestClient
from backend.main import app
import json

def test_ws_presence_and_broadcast():
    with TestClient(app) as client:
        with client.websocket_connect("/ws") as ws1, client.websocket_connect("/ws") as ws2:
            # Presence messages may be sent; read one from each
            msg1 = ws1.receive_text()
            msg2 = ws2.receive_text()
            try:
                data1 = json.loads(msg1)
                data2 = json.loads(msg2)
            except Exception:
                assert False, "Expected JSON presence messages"
            assert data1["type"] == "presence"
            assert data2["type"] == "presence"
            # Send file_change from ws1; ws2 should receive it
            event = {"type": "file_change", "payload": {"project_id": "p", "file_id": "f"}}
            ws1.send_text(json.dumps(event))
            received = ws2.receive_text()
            recv_data = json.loads(received)
            assert recv_data["type"] == "file_change"
