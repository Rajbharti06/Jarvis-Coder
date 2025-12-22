import asyncio
import json
import re
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple

BASE_DIR = Path(__file__).resolve().parents[2]
WORKSPACE_DIR = (BASE_DIR / "workspace").resolve()
PROJECTS_DB = (BASE_DIR / "projects.json").resolve()


@dataclass
class GenerationPlan:
    name: str
    description: str
    language: str
    framework: Optional[str]
    project_type: str
    files: List[Tuple[str, str]]
    test_command: str
    build_command: Optional[str]
    run_command: Optional[str]


class GenerationService:
    def __init__(self) -> None:
        WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)

    async def analyze_requirements(self, description: str) -> Dict[str, Any]:
        text = description.lower()
        language = self._detect_language(text)
        framework = self._detect_framework(text, language)
        project_type = self._detect_project_type(text)
        return {"language": language, "framework": framework, "project_type": project_type}

    def _detect_language(self, text: str) -> str:
        if any(k in text for k in ["fastapi", "django", "flask", "python"]):
            return "python"
        if any(k in text for k in ["node", "express", "typescript", "javascript"]):
            return "typescript"
        if any(k in text for k in ["react", "vite", "next.js", "next"]):
            return "typescript"
        if any(k in text for k in ["java", "spring", "maven", "gradle"]):
            return "java"
        if any(k in text for k in ["c++", "cpp", "cmake", "clang"]):
            return "cpp"
        if any(k in text for k in ["go", "golang"]):
            return "go"
        if any(k in text for k in ["rust"]):
            return "rust"
        return "typescript"

    def _detect_framework(self, text: str, language: str) -> Optional[str]:
        if language == "python":
            if "fastapi" in text:
                return "fastapi"
            if "django" in text:
                return "django"
            if "flask" in text:
                return "flask"
            return "fastapi"
        if language == "typescript":
            if any(k in text for k in ["react", "vite", "next.js", "next"]):
                if "next" in text or "next.js" in text:
                    return "next"
                return "react-vite"
            if any(k in text for k in ["express", "api", "backend"]):
                return "express"
            return "express"
        return None

    def _detect_project_type(self, text: str) -> str:
        if any(k in text for k in ["ui", "frontend", "react", "page", "landing"]):
            return "web-app"
        if any(k in text for k in ["api", "service", "backend"]):
            return "api"
        if any(k in text for k in ["cli", "command-line"]):
            return "cli"
        return "api"

    async def build_plan(self, name: str, description: str) -> GenerationPlan:
        analysis = await self.analyze_requirements(description)
        language = analysis["language"]
        framework = analysis["framework"]
        project_type = analysis["project_type"]

        if language == "python" and framework == "fastapi":
            files, test_cmd, build_cmd, run_cmd = self._python_fastapi_skeleton(name, description)
        elif language == "typescript" and framework == "express":
            files, test_cmd, build_cmd, run_cmd = self._typescript_express_skeleton(name, description)
        elif language == "typescript" and framework in {"react-vite", "next"}:
            files, test_cmd, build_cmd, run_cmd = self._react_vite_skeleton(name, description)
        elif language == "java":
            files, test_cmd, build_cmd, run_cmd = self._java_simple_skeleton(name, description)
        elif language == "cpp":
            files, test_cmd, build_cmd, run_cmd = self._cpp_simple_skeleton(name, description)
        else:
            files, test_cmd, build_cmd, run_cmd = self._minimal_skeleton(name, description)

        return GenerationPlan(
            name=name,
            description=description,
            language=language,
            framework=framework,
            project_type=project_type,
            files=files,
            test_command=test_cmd,
            build_command=build_cmd,
            run_command=run_cmd,
        )

    async def generate_project_stream(self, plan: GenerationPlan) -> AsyncGenerator[Dict[str, Any], None]:
        project_id = str(uuid.uuid4())
        project_dir = WORKSPACE_DIR / project_id
        project_dir.mkdir(parents=True, exist_ok=True)

        yield {"stage": "init", "message": "Initializing project", "project_id": project_id}
        await asyncio.sleep(0)

        created_files = []
        for rel_path, content in plan.files:
            target = project_dir / rel_path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")
            created_files.append(str(rel_path))
            yield {"stage": "file", "path": str(rel_path)}
            await asyncio.sleep(0)

        meta = {
            "id": project_id,
            "name": plan.name,
            "description": plan.description,
            "template": f"{plan.language}:{plan.framework or 'custom'}",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "path": str(project_dir),
            "commands": {
                "test": plan.test_command,
                "build": plan.build_command,
                "run": plan.run_command,
            },
        }
        self._save_project(meta)
        yield {"stage": "meta", "message": "Project metadata saved"}
        await asyncio.sleep(0)

        yield {
            "stage": "done",
            "message": "Generation complete",
            "summary": {
                "files_created": len(created_files),
                "commands": meta["commands"],
            },
            "project": meta,
        }

    def _save_project(self, project_meta: Dict[str, Any]) -> None:
        projects: List[Dict[str, Any]] = []
        if PROJECTS_DB.exists():
            try:
                projects = json.loads(PROJECTS_DB.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                projects = []
        projects.append(project_meta)
        PROJECTS_DB.parent.mkdir(parents=True, exist_ok=True)
        PROJECTS_DB.write_text(json.dumps(projects, indent=2, ensure_ascii=False), encoding="utf-8")

    def _minimal_skeleton(self, name: str, description: str) -> Tuple[List[Tuple[str, str]], str, Optional[str], Optional[str]]:
        readme = f"# {name}\n\n{description}\n"
        return [
            ("README.md", readme),
            ("src/main.ts", "export const hello = () => 'hello';\n"),
            ("test/basic.test.ts", "import { hello } from '../src/main';\ntest('hello', () => { expect(hello()).toBe('hello'); });\n"),
        ], "echo 'no tests'", None, None

    def _python_fastapi_skeleton(self, name: str, description: str) -> Tuple[List[Tuple[str, str]], str, Optional[str], Optional[str]]:
        files: List[Tuple[str, str]] = []
        files.append((
            "requirements.txt",
            "fastapi\nuvicorn[standard]\npytest\nhttpx\n",
        ))
        files.append((
            "app/main.py",
            "from fastapi import FastAPI, HTTPException\n\napp = FastAPI()\n\n@app.get('/health')\nasync def health():\n    return {'status': 'ok'}\n\n@app.get('/hello')\nasync def hello(name: str = 'world'):\n    if len(name) > 100:\n        raise HTTPException(status_code=400, detail='invalid name')\n    return {'message': f'hello {name}'}\n",
        ))
        files.append((
            "tests/test_app.py",
            "from fastapi.testclient import TestClient\nfrom app.main import app\n\nclient = TestClient(app)\n\ndef test_health():\n    r = client.get('/health')\n    assert r.status_code == 200\n    assert r.json()['status'] == 'ok'\n\ndef test_hello():\n    r = client.get('/hello', params={'name': 'jarvis'})\n    assert r.status_code == 200\n",
        ))
        files.append((
            "README.md",
            f"# {name}\n\n{description}\n\nInstall dependencies:\n\n```bash\npip install -r requirements.txt\n```\n\nRun:\n\n```bash\nuvicorn app.main:app --reload\n```\n\nTest:\n\n```bash\npytest\n```\n",
        ))
        return files, "pytest", None, "uvicorn app.main:app --reload"

    def _java_simple_skeleton(self, name: str, description: str) -> Tuple[List[Tuple[str, str]], str, Optional[str], Optional[str]]:
        files: List[Tuple[str, str]] = []
        main_java = (
            "import com.sun.net.httpserver.HttpServer;\n"
            "import com.sun.net.httpserver.HttpExchange;\n"
            "import java.io.IOException;\n"
            "import java.io.OutputStream;\n"
            "import java.net.InetSocketAddress;\n"
            "public class Main {\n"
            "  public static void main(String[] args) throws Exception {\n"
            "    HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);\n"
            "    server.createContext(\"/health\", (HttpExchange ex) -> {\n"
            "      byte[] resp = \"{\\\"status\\\":\\\"ok\\\"}\".getBytes();\n"
            "      ex.getResponseHeaders().add(\"Content-Type\", \"application/json\");\n"
            "      ex.sendResponseHeaders(200, resp.length);\n"
            "      try (OutputStream os = ex.getResponseBody()) { os.write(resp); }\n"
            "    });\n"
            "    server.createContext(\"/hello\", (HttpExchange ex) -> {\n"
            "      String response = \"{\\\"message\\\":\\\"hello\\\"}\";\n"
            "      byte[] resp = response.getBytes();\n"
            "      ex.getResponseHeaders().add(\"Content-Type\", \"application/json\");\n"
            "      ex.sendResponseHeaders(200, resp.length);\n"
            "      try (OutputStream os = ex.getResponseBody()) { os.write(resp); }\n"
            "    });\n"
            "    server.start();\n"
            "  }\n"
            "}\n"
        )
        files.append(("src/Main.java", main_java))
        files.append((
            "README.md",
            f"# {name}\n\n{description}\n\nBuild:\n\n```bash\njavac -d out src/Main.java\n```\n\nRun:\n\n```bash\njava -cp out Main\n```\n"
        ))
        return files, "echo 'no tests'", "javac -d out src/Main.java", "java -cp out Main"

    def _cpp_simple_skeleton(self, name: str, description: str) -> Tuple[List[Tuple[str, str]], str, Optional[str], Optional[str]]:
        files: List[Tuple[str, str]] = []
        main_cpp = (
            "#include <iostream>\n"
            "int main() {\n"
            "  std::cout << \"hello\\n\";\n"
            "  return 0;\n"
            "}\n"
        )
        files.append(("src/main.cpp", main_cpp))
        files.append((
            "README.md",
            f"# {name}\n\n{description}\n\nBuild:\n\n```bash\ng++ -O2 -std=c++17 -o bin/app src/main.cpp\n```\n\nRun:\n\n```bash\n./bin/app\n```\n"
        ))
        return files, "echo 'no tests'", "g++ -O2 -std=c++17 -o bin/app src/main.cpp", "bin/app"

    def _typescript_express_skeleton(self, name: str, description: str) -> Tuple[List[Tuple[str, str]], str, Optional[str], Optional[str]]:
        pkg = {
            "name": name,
            "version": "0.1.0",
            "private": True,
            "type": "module",
            "scripts": {
                "dev": "ts-node src/index.ts",
                "build": "tsc -p tsconfig.json",
                "start": "node dist/index.js",
                "test": "jest"
            },
            "dependencies": {"express": "^4.19.2", "zod": "^3.23.8"},
            "devDependencies": {
                "typescript": "^5.6.3",
                "ts-node": "^10.9.2",
                "jest": "^29.7.0",
                "ts-jest": "^29.1.1",
                "@types/express": "^4.17.21",
                "@types/jest": "^29.5.12",
                "supertest": "^6.3.4",
                "@types/supertest": "^2.0.16"
            }
        }
        tsconfig = {
            "compilerOptions": {
                "target": "ES2020",
                "module": "ESNext",
                "moduleResolution": "Node",
                "outDir": "dist",
                "strict": True,
                "esModuleInterop": True,
                "forceConsistentCasingInFileNames": True,
                "skipLibCheck": True
            },
            "include": ["src"]
        }
        files: List[Tuple[str, str]] = []
        files.append(("package.json", json.dumps(pkg, indent=2)))
        files.append(("tsconfig.json", json.dumps(tsconfig, indent=2)))
        files.append((
            "src/index.ts",
            "import express from 'express'\nimport { z } from 'zod'\n\nconst app = express()\napp.use(express.json())\n\nconst Query = z.object({ name: z.string().max(100).default('world') })\n\napp.get('/health', (_, res) => res.json({ status: 'ok' }))\napp.get('/hello', (req, res) => {\n  const parsed = Query.safeParse(req.query)\n  if (!parsed.success) return res.status(400).json({ error: 'invalid input' })\n  res.json({ message: `hello ${parsed.data.name}` })\n})\n\nconst port = process.env.PORT || 3000\napp.listen(port, () => {})\n",
        ))
        files.append((
            "tests/app.test.ts",
            "import request from 'supertest'\nimport express from 'express'\nconst app = express()\napp.get('/health', (_, res) => res.json({ status: 'ok' }))\n\ndescribe('health', () => {\n  it('returns ok', async () => {\n    const res = await request(app).get('/health')\n    expect(res.status).toBe(200)\n  })\n})\n",
        ))
        files.append((
            "README.md",
            f"# {name}\n\n{description}\n\nInstall:\n\n```bash\nnpm install\n```\n\nDev:\n\n```bash\nnpm run dev\n```\n\nTest:\n\n```bash\nnpm test\n```\n",
        ))
        return files, "npm test", "npm run build", "npm run dev"

    def _react_vite_skeleton(self, name: str, description: str) -> Tuple[List[Tuple[str, str]], str, Optional[str], Optional[str]]:
        pkg = {
            "name": name,
            "version": "0.1.0",
            "private": True,
            "type": "module",
            "scripts": {
                "dev": "vite",
                "build": "tsc && vite build",
                "preview": "vite preview",
                "test": "vitest"
            },
            "dependencies": {"react": "^18.2.0", "react-dom": "^18.2.0"},
            "devDependencies": {"vite": "^5.0.0", "typescript": "^5.6.3", "vitest": "^1.6.0"}
        }
        index_html = """<!doctype html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>App</title></head><body><div id=\"root\"></div><script type=\"module\" src=\"/src/main.tsx\"></script></body></html>"""
        main_tsx = "import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport App from './App'\nconst root = createRoot(document.getElementById('root')!)\nroot.render(<App />)\n"
        app_tsx = "export default function App() { return <div>Hello</div> }\n"
        test_ts = "import { describe, it, expect } from 'vitest'\ndescribe('sample', () => { it('works', () => expect(true).toBe(true)) })\n"
        files: List[Tuple[str, str]] = []
        files.append(("package.json", json.dumps(pkg, indent=2)))
        files.append(("index.html", index_html))
        files.append(("src/main.tsx", main_tsx))
        files.append(("src/App.tsx", app_tsx))
        files.append(("tests/app.test.ts", test_ts))
        files.append((
            "README.md",
            f"# {name}\n\n{description}\n\nInstall:\n\n```bash\nnpm install\n```\n\nDev:\n\n```bash\nnpm run dev\n```\n\nTest:\n\n```bash\nnpm test\n```\n",
        ))
        return files, "npm test", "npm run build", "npm run dev"


generation_service = GenerationService()