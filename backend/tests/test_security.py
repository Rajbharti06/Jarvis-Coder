import os
from pathlib import Path
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)
BASE_DIR = Path(__file__).resolve().parents[2]
WORKSPACE_DIR = (BASE_DIR / "workspace").resolve()

def setup_module(module):
    proj = WORKSPACE_DIR / "test_project_security"
    proj.mkdir(parents=True, exist_ok=True)
    # Create insecure Python file
    (proj / "insecure.py").write_text("eval('2+2')\n", encoding="utf-8")

def teardown_module(module):
    proj = WORKSPACE_DIR / "test_project_security"
    if proj.exists():
        for root, dirs, files in os.walk(proj, topdown=False):
            for f in files:
                Path(root, f).unlink(missing_ok=True)
            for d in dirs:
                Path(root, d).rmdir()
        proj.rmdir()

def test_security_scan_finds_eval():
    resp = client.get("/security/scan/test_project_security")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["summary"]["total_findings"] >= 1
    rules = {f["rule"] for f in data["findings"]}
    assert "PY-EVAL" in rules
