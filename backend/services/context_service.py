"""
Context Service for Jarvis Terminal
Provides intelligent codebase understanding and context-aware file reading
"""

import os
import ast
import json
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
from dataclasses import dataclass, asdict
from datetime import datetime
import hashlib
import fnmatch

import aiofiles
from fastapi import HTTPException


@dataclass
class FileInfo:
    """Information about a file in the codebase"""
    path: str
    name: str
    extension: str
    size: int
    modified: datetime
    content_hash: str
    language: str
    imports: List[str]
    exports: List[str]
    functions: List[str]
    classes: List[str]
    dependencies: List[str]
    complexity_score: int


@dataclass
class ProjectContext:
    """Overall project context and structure"""
    root_path: str
    name: str
    description: str
    languages: List[str]
    frameworks: List[str]
    dependencies: Dict[str, str]
    file_count: int
    total_lines: int
    structure: Dict[str, Any]
    last_updated: datetime


class ContextService:
    """Service for analyzing and understanding codebase context"""
    
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root).resolve()
        self.cache_dir = self.project_root / ".jarvis-cache"
        self.cache_dir.mkdir(exist_ok=True)
        
        # File patterns to ignore
        self.ignore_patterns = [
            "node_modules/*",
            ".git/*",
            "*.pyc",
            "__pycache__/*",
            ".venv/*",
            "venv/*",
            "dist/*",
            "build/*",
            ".next/*",
            ".nuxt/*",
            "coverage/*",
            "*.log",
            ".DS_Store",
            "Thumbs.db",
            "*.tmp",
            "*.temp",
            ".jarvis-cache/*"
        ]
        
        # Language detection patterns
        self.language_patterns = {
            ".py": "python",
            ".js": "javascript",
            ".ts": "typescript",
            ".tsx": "typescript",
            ".jsx": "javascript",
            ".java": "java",
            ".cpp": "cpp",
            ".c": "c",
            ".cs": "csharp",
            ".go": "go",
            ".rs": "rust",
            ".php": "php",
            ".rb": "ruby",
            ".swift": "swift",
            ".kt": "kotlin",
            ".scala": "scala",
            ".html": "html",
            ".css": "css",
            ".scss": "scss",
            ".sass": "sass",
            ".less": "less",
            ".json": "json",
            ".xml": "xml",
            ".yaml": "yaml",
            ".yml": "yaml",
            ".toml": "toml",
            ".md": "markdown",
            ".sql": "sql",
            ".sh": "bash",
            ".ps1": "powershell",
            ".dockerfile": "dockerfile",
            ".vue": "vue",
            ".svelte": "svelte"
        }

    async def analyze_project(self) -> ProjectContext:
        """Analyze the entire project and return context"""
        try:
            # Check cache first
            cache_file = self.cache_dir / "project_context.json"
            if await self._is_cache_valid(cache_file):
                async with aiofiles.open(cache_file, 'r') as f:
                    cached_data = json.loads(await f.read())
                    return ProjectContext(**cached_data)
            
            # Analyze project structure
            files = await self._scan_files()
            file_infos = []
            
            # Analyze each file
            for file_path in files:
                try:
                    file_info = await self._analyze_file(file_path)
                    if file_info:
                        file_infos.append(file_info)
                except Exception as e:
                    print(f"Error analyzing {file_path}: {e}")
                    continue
            
            # Build project context
            context = await self._build_project_context(file_infos)
            
            # Cache the result
            await self._cache_context(context, cache_file)
            
            return context
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to analyze project: {e}")

    async def get_file_context(self, file_path: str) -> Optional[FileInfo]:
        """Get detailed context for a specific file"""
        try:
            full_path = self.project_root / file_path
            if not full_path.exists():
                return None
            
            return await self._analyze_file(full_path)
            
        except Exception as e:
            print(f"Error getting file context for {file_path}: {e}")
            return None

    async def get_related_files(self, file_path: str, max_files: int = 10) -> List[FileInfo]:
        """Get files related to the given file based on imports, dependencies, etc."""
        try:
            file_info = await self.get_file_context(file_path)
            if not file_info:
                return []
            
            # Find related files based on imports and dependencies
            related_files = []
            all_files = await self._scan_files()
            
            for other_file in all_files:
                if str(other_file) == file_path:
                    continue
                
                other_info = await self._analyze_file(other_file)
                if not other_info:
                    continue
                
                # Calculate relationship score
                score = self._calculate_relationship_score(file_info, other_info)
                if score > 0:
                    related_files.append((score, other_info))
            
            # Sort by relationship score and return top files
            related_files.sort(key=lambda x: x[0], reverse=True)
            return [file_info for _, file_info in related_files[:max_files]]
            
        except Exception as e:
            print(f"Error getting related files for {file_path}: {e}")
            return []

    async def search_code(self, query: str, file_types: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Search for code patterns across the codebase"""
        try:
            results = []
            files = await self._scan_files()
            
            for file_path in files:
                if file_types:
                    file_ext = file_path.suffix.lower()
                    if file_ext not in file_types:
                        continue
                
                try:
                    async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                        content = await f.read()
                        
                    # Simple text search (can be enhanced with regex, AST parsing, etc.)
                    lines = content.split('\n')
                    for line_num, line in enumerate(lines, 1):
                        if query.lower() in line.lower():
                            results.append({
                                'file': str(file_path.relative_to(self.project_root)),
                                'line': line_num,
                                'content': line.strip(),
                                'context': self._get_line_context(lines, line_num - 1)
                            })
                            
                except Exception as e:
                    continue
            
            return results
            
        except Exception as e:
            print(f"Error searching code: {e}")
            return []

    async def get_project_summary(self) -> Dict[str, Any]:
        """Get a high-level summary of the project"""
        try:
            context = await self.analyze_project()
            
            return {
                'name': context.name,
                'description': context.description,
                'languages': context.languages,
                'frameworks': context.frameworks,
                'file_count': context.file_count,
                'total_lines': context.total_lines,
                'main_directories': list(context.structure.keys()),
                'last_updated': context.last_updated.isoformat()
            }
            
        except Exception as e:
            print(f"Error getting project summary: {e}")
            return {}

    # Private methods

    async def _scan_files(self) -> List[Path]:
        """Scan project directory for relevant files"""
        files = []
        
        for root, dirs, filenames in os.walk(self.project_root):
            # Skip ignored directories
            dirs[:] = [d for d in dirs if not self._should_ignore(os.path.join(root, d))]
            
            for filename in filenames:
                file_path = Path(root) / filename
                if not self._should_ignore(str(file_path)):
                    files.append(file_path)
        
        return files

    def _should_ignore(self, path: str) -> bool:
        """Check if a path should be ignored"""
        rel_path = os.path.relpath(path, self.project_root)
        
        for pattern in self.ignore_patterns:
            if fnmatch.fnmatch(rel_path, pattern):
                return True
        
        return False

    async def _analyze_file(self, file_path: Path) -> Optional[FileInfo]:
        """Analyze a single file and extract information"""
        try:
            if not file_path.is_file():
                return None
            
            stat = file_path.stat()
            extension = file_path.suffix.lower()
            language = self.language_patterns.get(extension, "unknown")
            
            # Read file content
            try:
                async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                    content = await f.read()
            except UnicodeDecodeError:
                # Skip binary files
                return None
            
            # Calculate content hash
            content_hash = hashlib.md5(content.encode()).hexdigest()
            
            # Extract code information based on language
            imports, exports, functions, classes, dependencies = await self._extract_code_info(content, language)
            
            # Calculate complexity score
            complexity_score = self._calculate_complexity(content, language)
            
            return FileInfo(
                path=str(file_path.relative_to(self.project_root)),
                name=file_path.name,
                extension=extension,
                size=stat.st_size,
                modified=datetime.fromtimestamp(stat.st_mtime),
                content_hash=content_hash,
                language=language,
                imports=imports,
                exports=exports,
                functions=functions,
                classes=classes,
                dependencies=dependencies,
                complexity_score=complexity_score
            )
            
        except Exception as e:
            print(f"Error analyzing file {file_path}: {e}")
            return None

    async def _extract_code_info(self, content: str, language: str) -> Tuple[List[str], List[str], List[str], List[str], List[str]]:
        """Extract imports, exports, functions, classes, and dependencies from code"""
        imports = []
        exports = []
        functions = []
        classes = []
        dependencies = []
        
        try:
            if language == "python":
                imports, exports, functions, classes = self._analyze_python_code(content)
            elif language in ["javascript", "typescript"]:
                imports, exports, functions, classes = self._analyze_js_ts_code(content)
            # Add more language analyzers as needed
            
        except Exception as e:
            print(f"Error extracting code info for {language}: {e}")
        
        return imports, exports, functions, classes, dependencies

    def _analyze_python_code(self, content: str) -> Tuple[List[str], List[str], List[str], List[str]]:
        """Analyze Python code using AST"""
        imports = []
        exports = []
        functions = []
        classes = []
        
        try:
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        imports.append(alias.name)
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        imports.append(node.module)
                elif isinstance(node, ast.FunctionDef):
                    functions.append(node.name)
                elif isinstance(node, ast.ClassDef):
                    classes.append(node.name)
                    
        except SyntaxError:
            # Fallback to simple regex parsing for invalid syntax
            pass
        
        return imports, exports, functions, classes

    def _analyze_js_ts_code(self, content: str) -> Tuple[List[str], List[str], List[str], List[str]]:
        """Analyze JavaScript/TypeScript code using simple regex"""
        import re
        
        imports = []
        exports = []
        functions = []
        classes = []
        
        # Extract imports
        import_patterns = [
            r'import\s+.*?\s+from\s+[\'"]([^\'"]+)[\'"]',
            r'import\s+[\'"]([^\'"]+)[\'"]',
            r'require\([\'"]([^\'"]+)[\'"]\)'
        ]
        
        for pattern in import_patterns:
            matches = re.findall(pattern, content)
            imports.extend(matches)
        
        # Extract exports
        export_patterns = [
            r'export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)',
            r'export\s+\{\s*([^}]+)\s*\}',
        ]
        
        for pattern in export_patterns:
            matches = re.findall(pattern, content)
            exports.extend(matches)
        
        # Extract functions
        function_patterns = [
            r'function\s+(\w+)',
            r'const\s+(\w+)\s*=\s*(?:async\s+)?\(',
            r'(\w+)\s*:\s*(?:async\s+)?function',
        ]
        
        for pattern in function_patterns:
            matches = re.findall(pattern, content)
            functions.extend(matches)
        
        # Extract classes
        class_matches = re.findall(r'class\s+(\w+)', content)
        classes.extend(class_matches)
        
        return imports, exports, functions, classes

    def _calculate_complexity(self, content: str, language: str) -> int:
        """Calculate a simple complexity score for the file"""
        lines = content.split('\n')
        non_empty_lines = [line for line in lines if line.strip()]
        
        # Basic complexity factors
        complexity = len(non_empty_lines)
        
        # Add complexity for control structures
        control_keywords = ['if', 'for', 'while', 'switch', 'try', 'catch', 'elif', 'else']
        for line in non_empty_lines:
            for keyword in control_keywords:
                if keyword in line.lower():
                    complexity += 2
        
        return min(complexity, 1000)  # Cap at 1000

    def _calculate_relationship_score(self, file1: FileInfo, file2: FileInfo) -> int:
        """Calculate relationship score between two files"""
        score = 0
        
        # Same directory bonus
        if os.path.dirname(file1.path) == os.path.dirname(file2.path):
            score += 10
        
        # Import/dependency relationship
        for imp in file1.imports:
            if imp in file2.exports or imp in file2.name:
                score += 20
        
        for imp in file2.imports:
            if imp in file1.exports or imp in file1.name:
                score += 20
        
        # Same language bonus
        if file1.language == file2.language:
            score += 5
        
        # Function/class name similarity
        common_functions = set(file1.functions) & set(file2.functions)
        common_classes = set(file1.classes) & set(file2.classes)
        score += len(common_functions) * 3 + len(common_classes) * 5
        
        return score

    def _get_line_context(self, lines: List[str], line_index: int, context_size: int = 2) -> List[str]:
        """Get surrounding lines for context"""
        start = max(0, line_index - context_size)
        end = min(len(lines), line_index + context_size + 1)
        return lines[start:end]

    async def _build_project_context(self, file_infos: List[FileInfo]) -> ProjectContext:
        """Build overall project context from file information"""
        # Detect project name
        project_name = self.project_root.name
        
        # Detect languages and frameworks
        languages = list(set(f.language for f in file_infos if f.language != "unknown"))
        frameworks = await self._detect_frameworks(file_infos)
        
        # Build directory structure
        structure = {}
        for file_info in file_infos:
            parts = Path(file_info.path).parts
            current = structure
            for part in parts[:-1]:
                if part not in current:
                    current[part] = {}
                current = current[part]
        
        # Calculate totals
        total_lines = sum(f.size // 50 for f in file_infos)  # Rough estimate
        
        # Try to get description from README
        description = await self._get_project_description()
        
        # Get dependencies
        dependencies = await self._get_project_dependencies()
        
        return ProjectContext(
            root_path=str(self.project_root),
            name=project_name,
            description=description,
            languages=languages,
            frameworks=frameworks,
            dependencies=dependencies,
            file_count=len(file_infos),
            total_lines=total_lines,
            structure=structure,
            last_updated=datetime.now()
        )

    async def _detect_frameworks(self, file_infos: List[FileInfo]) -> List[str]:
        """Detect frameworks used in the project"""
        frameworks = []
        
        # Check for common framework indicators
        framework_indicators = {
            "react": ["react", "jsx", "tsx"],
            "vue": ["vue"],
            "angular": ["angular", "@angular"],
            "svelte": ["svelte"],
            "next.js": ["next"],
            "nuxt": ["nuxt"],
            "express": ["express"],
            "fastapi": ["fastapi"],
            "django": ["django"],
            "flask": ["flask"],
            "spring": ["spring"],
            "laravel": ["laravel"],
            "rails": ["rails"]
        }
        
        all_imports = []
        for file_info in file_infos:
            all_imports.extend(file_info.imports)
        
        for framework, indicators in framework_indicators.items():
            if any(indicator in " ".join(all_imports).lower() for indicator in indicators):
                frameworks.append(framework)
        
        return frameworks

    async def _get_project_description(self) -> str:
        """Try to get project description from README or package.json"""
        description = "No description available"
        
        # Check README files
        readme_files = ["README.md", "README.txt", "README.rst", "readme.md"]
        for readme_file in readme_files:
            readme_path = self.project_root / readme_file
            if readme_path.exists():
                try:
                    async with aiofiles.open(readme_path, 'r', encoding='utf-8') as f:
                        content = await f.read()
                        # Extract first paragraph as description
                        lines = content.split('\n')
                        for line in lines:
                            if line.strip() and not line.startswith('#'):
                                description = line.strip()[:200]
                                break
                except Exception:
                    pass
                break
        
        # Check package.json
        package_json = self.project_root / "package.json"
        if package_json.exists():
            try:
                async with aiofiles.open(package_json, 'r') as f:
                    data = json.loads(await f.read())
                    if "description" in data:
                        description = data["description"]
            except Exception:
                pass
        
        return description

    async def _get_project_dependencies(self) -> Dict[str, str]:
        """Get project dependencies from various config files"""
        dependencies = {}
        
        # Check package.json
        package_json = self.project_root / "package.json"
        if package_json.exists():
            try:
                async with aiofiles.open(package_json, 'r') as f:
                    data = json.loads(await f.read())
                    if "dependencies" in data:
                        dependencies.update(data["dependencies"])
                    if "devDependencies" in data:
                        dependencies.update(data["devDependencies"])
            except Exception:
                pass
        
        # Check requirements.txt
        requirements_txt = self.project_root / "requirements.txt"
        if requirements_txt.exists():
            try:
                async with aiofiles.open(requirements_txt, 'r') as f:
                    content = await f.read()
                    for line in content.split('\n'):
                        line = line.strip()
                        if line and not line.startswith('#'):
                            if '==' in line:
                                name, version = line.split('==', 1)
                                dependencies[name] = version
                            else:
                                dependencies[line] = "latest"
            except Exception:
                pass
        
        return dependencies

    async def _is_cache_valid(self, cache_file: Path, max_age_hours: int = 1) -> bool:
        """Check if cache file is valid and not too old"""
        if not cache_file.exists():
            return False
        
        try:
            stat = cache_file.stat()
            age_hours = (datetime.now().timestamp() - stat.st_mtime) / 3600
            return age_hours < max_age_hours
        except Exception:
            return False

    async def _cache_context(self, context: ProjectContext, cache_file: Path):
        """Cache project context to file"""
        try:
            async with aiofiles.open(cache_file, 'w') as f:
                await f.write(json.dumps(asdict(context), default=str, indent=2))
        except Exception as e:
            print(f"Failed to cache context: {e}")


# Global instance
context_service = ContextService()