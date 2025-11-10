from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import os
import shutil
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

router = APIRouter()

# Define the absolute path to the workspace directory
BASE_DIR = Path(__file__).resolve().parents[2]
WORKSPACE_DIR = (BASE_DIR / "workspace").resolve()
PROJECTS_DB = (BASE_DIR / "projects.json").resolve()

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    template: Optional[str] = "empty"  # empty, react, nextjs, python, django, etc.

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class Project(BaseModel):
    id: str
    name: str
    description: str
    template: str
    created_at: str
    updated_at: str
    path: str

def load_projects() -> List[Dict[str, Any]]:
    """Load projects from the JSON database"""
    if not PROJECTS_DB.exists():
        return []
    try:
        with open(PROJECTS_DB, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return []

def save_projects(projects: List[Dict[str, Any]]) -> None:
    """Save projects to the JSON database"""
    PROJECTS_DB.parent.mkdir(parents=True, exist_ok=True)
    with open(PROJECTS_DB, 'w', encoding='utf-8') as f:
        json.dump(projects, f, indent=2, ensure_ascii=False)

def create_project_template(project_path: Path, template: str) -> None:
    """Create project files based on template"""
    project_path.mkdir(parents=True, exist_ok=True)
    
    if template == "react":
        # Create basic React project structure
        (project_path / "src").mkdir(exist_ok=True)
        (project_path / "public").mkdir(exist_ok=True)
        
        # package.json
        package_json = {
            "name": project_path.name,
            "version": "0.1.0",
            "private": True,
            "dependencies": {
                "react": "^18.2.0",
                "react-dom": "^18.2.0",
                "react-scripts": "5.0.1"
            },
            "scripts": {
                "start": "react-scripts start",
                "build": "react-scripts build",
                "test": "react-scripts test",
                "eject": "react-scripts eject"
            }
        }
        with open(project_path / "package.json", 'w') as f:
            json.dump(package_json, f, indent=2)
        
        # App.js
        app_js = '''import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to React</h1>
        <p>Edit <code>src/App.js</code> and save to reload.</p>
      </header>
    </div>
  );
}

export default App;
'''
        (project_path / "src" / "App.js").write_text(app_js)
        
        # App.css
        app_css = '''.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
}
'''
        (project_path / "src" / "App.css").write_text(app_css)
        
        # index.js
        index_js = '''import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
'''
        (project_path / "src" / "index.js").write_text(index_js)
        
        # index.css
        index_css = '''body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
'''
        (project_path / "src" / "index.css").write_text(index_css)
        
        # public/index.html
        index_html = '''<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Web site created using Jarvis Coder" />
    <title>React App</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
'''
        (project_path / "public" / "index.html").write_text(index_html)
        
    elif template == "python":
        # Create basic Python project structure
        (project_path / "src").mkdir(exist_ok=True)
        (project_path / "tests").mkdir(exist_ok=True)
        
        # main.py
        main_py = '''#!/usr/bin/env python3
"""
Main module for the Python project.
"""

def main():
    """Main function"""
    print("Hello, World!")
    print("Welcome to your new Python project!")

if __name__ == "__main__":
    main()
'''
        (project_path / "src" / "main.py").write_text(main_py)
        
        # requirements.txt
        requirements = '''# Add your project dependencies here
# Example:
# requests>=2.28.0
# numpy>=1.21.0
'''
        (project_path / "requirements.txt").write_text(requirements)
        
        # README.md
        readme = f'''# {project_path.name}

A Python project created with Jarvis Coder.

## Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

2. Activate the virtual environment:
   - Windows: `venv\\Scripts\\activate`
   - macOS/Linux: `source venv/bin/activate`

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

Run the main script:
```bash
python src/main.py
```

## Testing

Run tests:
```bash
python -m pytest tests/
```
'''
        (project_path / "README.md").write_text(readme)
        
        # .gitignore
        gitignore = '''# Byte-compiled / optimized / DLL files
__pycache__/
*.py[cod]
*$py.class

# Virtual environments
venv/
env/
ENV/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
'''
        (project_path / ".gitignore").write_text(gitignore)
        
    else:  # empty template
        # Create a simple README
        readme = f'''# {project_path.name}

A new project created with Jarvis Coder.

## Getting Started

Start building your project here!
'''
        (project_path / "README.md").write_text(readme)

@router.get("/", response_model=List[Project])
async def get_projects():
    """Get all projects"""
    try:
        projects_data = load_projects()
        projects = []
        
        for project_data in projects_data:
            # Verify project directory still exists
            project_path = Path(project_data["path"])
            if project_path.exists():
                projects.append(Project(**project_data))
            else:
                # Remove from database if directory doesn't exist
                projects_data.remove(project_data)
        
        # Save updated projects list
        save_projects([p.dict() for p in projects])
        return projects
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading projects: {str(e)}")

@router.post("/", response_model=Project)
async def create_project(project_data: ProjectCreate):
    """Create a new project"""
    try:
        # Generate unique project ID
        project_id = str(uuid.uuid4())
        
        # Create project directory
        project_path = WORKSPACE_DIR / project_id
        if project_path.exists():
            raise HTTPException(status_code=400, detail="Project directory already exists")
        
        # Create project structure based on template
        create_project_template(project_path, project_data.template)
        
        # Create project record
        now = datetime.now().isoformat()
        project = Project(
            id=project_id,
            name=project_data.name,
            description=project_data.description or "",
            template=project_data.template,
            created_at=now,
            updated_at=now,
            path=str(project_path)
        )
        
        # Save to database
        projects = load_projects()
        projects.append(project.dict())
        save_projects(projects)
        
        return project
        
    except Exception as e:
        # Clean up if project creation failed
        if 'project_path' in locals() and project_path.exists():
            shutil.rmtree(project_path, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Error creating project: {str(e)}")

@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Get a specific project"""
    try:
        projects = load_projects()
        project_data = next((p for p in projects if p["id"] == project_id), None)
        
        if not project_data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Verify project directory exists
        project_path = Path(project_data["path"])
        if not project_path.exists():
            raise HTTPException(status_code=404, detail="Project directory not found")
        
        return Project(**project_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading project: {str(e)}")

@router.put("/{project_id}", response_model=Project)
async def update_project(project_id: str, project_update: ProjectUpdate):
    """Update a project"""
    try:
        projects = load_projects()
        project_index = next((i for i, p in enumerate(projects) if p["id"] == project_id), None)
        
        if project_index is None:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Update project data
        project_data = projects[project_index]
        if project_update.name is not None:
            project_data["name"] = project_update.name
        if project_update.description is not None:
            project_data["description"] = project_update.description
        
        project_data["updated_at"] = datetime.now().isoformat()
        
        # Save to database
        save_projects(projects)
        
        return Project(**project_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating project: {str(e)}")

@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a project"""
    try:
        projects = load_projects()
        project_data = next((p for p in projects if p["id"] == project_id), None)
        
        if not project_data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Remove project directory
        project_path = Path(project_data["path"])
        if project_path.exists():
            shutil.rmtree(project_path)
        
        # Remove from database
        projects = [p for p in projects if p["id"] != project_id]
        save_projects(projects)
        
        return {"message": f"Project '{project_data['name']}' deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting project: {str(e)}")

@router.get("/{project_id}/files")
async def get_project_files(project_id: str):
    """Get file tree for a project"""
    try:
        projects = load_projects()
        project_data = next((p for p in projects if p["id"] == project_id), None)
        
        if not project_data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project_path = Path(project_data["path"])
        if not project_path.exists():
            raise HTTPException(status_code=404, detail="Project directory not found")
        
        def build_file_tree(path: Path, relative_to: Path) -> List[Dict[str, Any]]:
            """Recursively build file tree"""
            items = []
            
            try:
                for item in sorted(path.iterdir(), key=lambda x: (x.is_file(), x.name.lower())):
                    if item.name.startswith('.'):
                        continue  # Skip hidden files
                    
                    relative_path = item.relative_to(relative_to)
                    
                    if item.is_dir():
                        items.append({
                            "name": item.name,
                            "path": str(relative_path),
                            "type": "directory",
                            "children": build_file_tree(item, relative_to)
                        })
                    else:
                        items.append({
                            "name": item.name,
                            "path": str(relative_path),
                            "type": "file"
                        })
            except PermissionError:
                pass  # Skip directories we can't read
            
            return items
        
        file_tree = build_file_tree(project_path, project_path)
        return {"files": file_tree}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading project files: {str(e)}")