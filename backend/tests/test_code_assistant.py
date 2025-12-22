from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def test_code_suggestions_endpoint_basic():
    payload = {
        "code": "def add(a, b):\n    return a + b\n",
        "language": "python",
    }
    resp = client.post("/api/ai/code-suggestions", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "suggestions" in data
    assert isinstance(data["suggestions"], list)
    assert len(data["suggestions"]) > 0


def test_usage_endpoint_basic():
    resp = client.get("/api/ai/usage")
    assert resp.status_code == 200
    data = resp.json()
    assert "mode" in data
    assert "available_models" in data

def test_command_suggestions_endpoint():
    payload = {"partial": "git comm"}
    resp = client.post("/api/ai/command-suggestions", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "result" in data
    assert isinstance(data["result"], str)
    assert len(data["result"]) > 0

def test_docs_lookup_endpoint():
    payload = {"query": "How to create and activate Python venv", "language": "python"}
    resp = client.post("/api/ai/docs", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "result" in data
    assert isinstance(data["result"], str)
    assert "venv" in data["result"].lower()
