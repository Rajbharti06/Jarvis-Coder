from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_register_and_enable_plugin():
    manifest = {
        "id": "sample-plugin",
        "name": "Sample Plugin",
        "version": "0.1.0",
        "description": "Test plugin"
    }
    resp = client.post("/plugins/", json=manifest)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "sample-plugin"
    assert data.get("enabled") is False

    resp2 = client.post("/plugins/sample-plugin/enable")
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["enabled"] is True

    resp3 = client.get("/plugins/")
    assert resp3.status_code == 200
    plugins = resp3.json()
    ids = [p["id"] for p in plugins]
    assert "sample-plugin" in ids
