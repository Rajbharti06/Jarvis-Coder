import pytest
from fastapi.testclient import TestClient
from backend.main import app

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

def test_read_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the Jarvis Coder API!"}

def test_websocket_echo():
    with TestClient(app) as client:
        with client.websocket_connect("/ws") as websocket:
            websocket.send_text("Hello world!")
            data = websocket.receive_text()
            assert data == "Message from client: Hello world!"
