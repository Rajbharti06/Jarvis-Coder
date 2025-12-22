import re
from typing import Dict, Any, Optional
from backend.services.ai_service import ai_service
from backend.services.workspace_service import workspace_service
from backend.services.logging_service import logger

class CommandProcessor:
    """Process and handle various Jarvis commands"""
    
    def __init__(self):
        self.command_handlers = {
            'code': self._handle_code_command,
            'explain': self._handle_explain_command,
            'fix': self._handle_fix_command,
            'new': self._handle_new_command,
            'run': self._handle_run_command,
            'save': self._handle_save_command,
            'deploy': self._handle_deploy_command,
            'git': self._handle_git_command,
            'templates': self._handle_templates_command,
            'model': self._handle_model_command,
            'test': self._handle_test_command,
            'refactor': self._handle_refactor_command,
            'typescript': self._handle_typescript_command,
            'production': self._handle_production_command,
        }
    
    async def process_command(self, command: str, model: Optional[str] = None) -> str:
        """Process a command and return the response"""
        command = command.strip()
        
        # Check for model switching command first
        if command.startswith('/model'):
            return await self._handle_model_command(command[6:].strip())
        
        if not command.startswith('/'):
            # Regular chat message
            return await self._handle_chat_message(command, model)
        
        # Extract command and arguments
        parts = command[1:].split(' ', 1)
        cmd = parts[0].lower()
        args = parts[1] if len(parts) > 1 else ""
        
        if cmd in self.command_handlers:
            return await self.command_handlers[cmd](args, model)
        else:
            return f"Unknown command: /{cmd}. Available commands: {', '.join(self.command_handlers.keys())}"
    
    async def _handle_chat_message(self, message: str, model: Optional[str]) -> str:
        """Handle regular chat messages"""
        response = ""
        async for chunk in ai_service.generate_response(message, model, False):
            response += chunk
        
        logger.log_chat(message, response, model or "default")
        return response
    
    async def _handle_model_command(self, args: str, model: Optional[str] = None) -> str:
        """Handle /model command - switch AI models"""
        if not args:
            # Show current model and available models
            current_model = model or "default"
            available_models = self._get_available_models()
            return f"Current model: {current_model}\nAvailable models:\n{available_models}"
        
        # Set model for current session
        new_model = args.strip()
        available_models = self._get_available_models_list()
        
        if new_model in available_models:
            return f"✅ Model switched to: {new_model}\nUse this model for your next requests."
        else:
            return f"❌ Model '{new_model}' not found. Available models: {', '.join(available_models)}"
    
    def _get_available_models(self) -> str:
        """Get formatted list of available models"""
        models = self._get_available_models_list()
        return "\n".join(f"• {model}" for model in models)
    
    def _get_available_models_list(self) -> list:
        """Get list of available models from configuration"""
        # This would ideally come from a configuration service
        # For now, return a static list based on common models
        return [
            # OpenAI models
            "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo",
            # Anthropic models
            "claude-3-opus", "claude-3-sonnet", "claude-3-haiku",
            # Mistral models
            "mistral-large", "mistral-medium", "codestral",
            # Groq models
            "llama3-70b", "llama3-8b", "mixtral-8x7b",
            # Local models
            "mistral", "gpt-oss:20b", "deepseek-coder", "codellama"
        ]
    
    async def _handle_code_command(self, args: str, model: Optional[str] = None) -> str:
        """Handle /code command - generate code"""
        if not args:
            return "Please provide a description of what code you want to generate. Example: /code create a Python function that calculates factorial"
        
        prompt = f"Generate production-ready code for: {args}. Please provide complete, well-structured code with proper documentation and error handling."
        
        response = ""
        async for chunk in ai_service.generate_response(prompt, model, False):
            response += chunk
        
        # Extract code blocks and save them
        code_blocks = self._extract_code_blocks(response)
        if code_blocks:
            for i, (language, code) in enumerate(code_blocks):
                filename = f"generated_code_{i+1}.{self._get_extension(language)}"
                result = await workspace_service.save_code(code, filename, language)
                if result['success']:
                    response += f"\n\n💾 Saved as: {filename}"
                else:
                    response += f"\n\n❌ Failed to save: {result['message']}"
        
        logger.log_code_generation(args, "multiple_files" if code_blocks else "no_code", True)
        return response
    
    async def _handle_explain_command(self, args: str, model: Optional[str] = None) -> str:
        """Handle /explain command - explain code"""
        if not args:
            return "Please provide code to explain. Example: /explain function hello() { return 'world'; }"
        
        # Check if args is a file path
        if args.startswith('./') or args.startswith('/') or args.startswith('..'):
            try:
                # Try to read file content
                file_content = await workspace_service.read_file(args)
                code = file_content
                prompt = f"Explain this code from file {args} in detail, including its purpose, how it works, and any potential improvements:\n\n{code}"
            except Exception:
                # If file doesn't exist, treat as code
                prompt = f"Explain this code in detail, including its purpose, how it works, and any potential improvements:\n\n{args}"
        else:
            prompt = f"Explain this code in detail, including its purpose, how it works, and any potential improvements:\n\n{args}"
        
        response = ""
        async for chunk in ai_service.generate_response(prompt, model, False):
            response += chunk
        
        logger.log_chat(f"/explain {args}", response, model or "default")
        return response
    
    async def _handle_fix_command(self, args: str, model: Optional[str] = None) -> str:
        """Handle /fix command - fix broken code"""
        if not args:
            return "Please provide code that needs fixing. Example: /fix const x = 5; x = 10;"
        
        prompt = f"Fix this code and explain what was wrong:\n\n{args}"
        
        response = ""
        async for chunk in ai_service.generate_response(prompt, model, False):
            response += chunk
        
        logger.log_chat(f"/fix {args}", response, model or "default")
        return response
    
    async def _handle_new_command(self, args: str, model: Optional[str] = None) -> str:
        """Handle /new command - create new project"""
        if not args:
            return "Please specify project type. Example: /new react my-app"
        
        parts = args.split(' ', 1)
        project_type = parts[0].lower()
        project_name = parts[1] if len(parts) > 1 else f"{project_type}-project"
        
        result = await workspace_service.create_project_structure(project_type, project_name)
        
        if result['success']:
            return f"✅ Project '{project_name}' created successfully!\n{result['message']}"
        else:
            return f"❌ Failed to create project: {result['message']}"
    
    async def _handle_run_command(self, args: str, model: Optional[str] = None) -> str:
        """Handle /run command - execute code"""
        if not args:
            return "Please specify what to run. Example: /run main.py or /run 'python script.py'"
        
        # This would integrate with a code execution service
        return "🚧 Code execution feature is coming soon. For now, I can help you write and save code that you can run locally."
    
    async def _handle_save_command(self, args: str, model: Optional[str] = None) -> str:
        """Handle /save command - save code to file"""
        if not args:
            return "Please provide code to save. Example: /save filename.py 'print(\"Hello\")'"
        
        # Parse filename and code
        parts = args.split(' ', 1)
        if len(parts) < 2:
            return "Please provide both filename and code. Example: /save hello.py 'print(\"Hello World\")'"
        
        filename = parts[0]
        code = parts[1]
        
        # Determine language from filename extension
        language = filename.split('.')[-1] if '.' in filename else "txt"
        
        result = await workspace_service.save_code(code, filename, language)
        
        if result['success']:
            return f"✅ Code saved to {filename}"
        else:
            return f"❌ Failed to save: {result['message']}"
    
    async def _handle_deploy_command(self, args: str, model: Optional[str] = None) -> str:
        """Handle /deploy command - create deployment config"""
        prompt = f"Create deployment configuration for: {args if args else 'a web application'}. Include Dockerfile, CI/CD pipeline, and deployment instructions."
        
        response = ""
        async for chunk in ai_service.generate_response(prompt, model, False):
            response += chunk
        
        return response
    
    async def _handle_git_command(self, args: str, model: Optional[str] = None) -> str:
        """Handle /git command - git operations"""
        if not args:
            return "Please specify git command. Example: /git init or /git 'add .'"
        
        # This would integrate with git operations
        return f"🚧 Git integration coming soon. You requested: git {args}"
    
    async def _handle_templates_command(self, args: str, model: Optional[str] = None) -> str:
        """Handle /templates command - list available templates"""
        templates = [
            "react - React application",
            "nextjs - Next.js application",
            "django - Django web framework",
            "fastapi - FastAPI web framework", 
            "flask - Flask web framework",
            "node - Node.js application"
        ]
        
        return "Available project templates:\n" + "\n".join(f"• {template}" for template in templates)
    
    def _extract_code_blocks(self, text: str) -> list:
        """Extract code blocks from AI response"""
        pattern = r'```(\w+)?\s*(.*?)```'
        matches = re.findall(pattern, text, re.DOTALL)
        
        code_blocks = []
        for match in matches:
            language = match[0] if match[0] else "text"
            code = match[1].strip()
            code_blocks.append((language, code))
        
        return code_blocks
    
    def _get_extension(self, language: str) -> str:
        """Get file extension for language"""
        extensions = {
            "python": "py", "py": "py",
            "javascript": "js", "js": "js", 
            "typescript": "ts", "ts": "ts",
            "html": "html", "css": "css",
            "java": "java", "cpp": "cpp", "c": "c",
            "go": "go", "rust": "rs", "ruby": "rb",
            "php": "php", "shell": "sh", "bash": "sh",
            "docker": "Dockerfile", "yaml": "yml", "json": "json",
            "markdown": "md", "text": "txt"
        }
        return extensions.get(language.lower(), "txt")

    async def _handle_test_command(self, args: str, model: Optional[str] = None) -> str:
        """Handle /test command - write unit tests for code"""
        if not args:
            return "Please provide code or a file path to write tests for. Example: /test function add(a, b) { return a + b; }"
        
        # Check if args is a file path
        if args.startswith('./') or args.startswith('/') or args.startswith('..'):
            try:
                # Try to read file content
                file_content = await workspace_service.read_file(args)
                code = file_content
                prompt = f"Write comprehensive unit tests for this code from file {args}. Include edge cases and proper test structure:\n\n{code}"
            except Exception:
                # If file doesn't exist, treat as code
                prompt = f"Write comprehensive unit tests for this code. Include edge cases and proper test structure:\n\n{args}"
        else:
            prompt = f"Write comprehensive unit tests for this code. Include edge cases and proper test structure:\n\n{args}"
        
        response = ""
        async for chunk in ai_service.generate_response(prompt, model, False):
            response += chunk
        
        logger.log_chat(f"/test {args}", response, model or "default")
        return response

    async def _handle_refactor_command(self, args: str, model: Optional[str] = None) -> str:
        """Handle /refactor command - refactor code for better quality"""
        if not args:
            return "Please provide code or a file path to refactor. Example: /refactor function oldFunction() { /* messy code */ }"
        
        # Check if args is a file path
        if args.startswith('./') or args.startswith('/') or args.startswith('..'):
            try:
                # Try to read file content
                file_content = await workspace_service.read_file(args)
                code = file_content
                prompt = f"Refactor this code from file {args} to improve readability, performance, and maintainability. Explain the changes made:\n\n{code}"
            except Exception:
                # If file doesn't exist, treat as code
                prompt = f"Refactor this code to improve readability, performance, and maintainability. Explain the changes made:\n\n{args}"
        else:
            prompt = f"Refactor this code to improve readability, performance, and maintainability. Explain the changes made:\n\n{args}"
        
        response = ""
        async for chunk in ai_service.generate_response(prompt, model, False):
            response += chunk
        
        logger.log_chat(f"/refactor {args}", response, model or "default")
        return response

    async def _handle_typescript_command(self, args: str, model: Optional[str] = None) -> str:
        """Handle /typescript command - convert JavaScript to TypeScript"""
        if not args:
            return "Please provide JavaScript code or a file path to convert to TypeScript. Example: /typescript function add(a, b) { return a + b; }"
        
        # Check if args is a file path
        if args.startswith('./') or args.startswith('/') or args.startswith('..'):
            try:
                # Try to read file content
                file_content = await workspace_service.read_file(args)
                code = file_content
                prompt = f"Convert this JavaScript code from file {args} to TypeScript. Add proper type annotations and interfaces:\n\n{code}"
            except Exception:
                # If file doesn't exist, treat as code
                prompt = f"Convert this JavaScript code to TypeScript. Add proper type annotations and interfaces:\n\n{args}"
        else:
            prompt = f"Convert this JavaScript code to TypeScript. Add proper type annotations and interfaces:\n\n{args}"
        
        response = ""
        async for chunk in ai_service.generate_response(prompt, model, False):
            response += chunk
        
        logger.log_chat(f"/typescript {args}", response, model or "default")
        return response

    async def _handle_production_command(self, args: str, model: Optional[str] = None) -> str:
        """Handle /production command - make code production-ready"""
        if not args:
            return "Please provide code or a file path to make production-ready. Example: /production function calculate() { /* code */ }"
        
        # Check if args is a file path
        if args.startswith('./') or args.startswith('/') or args.startswith('..'):
            try:
                # Try to read file content
                file_content = await workspace_service.read_file(args)
                code = file_content
                prompt = f"Make this code from file {args} production-ready. Add error handling, input validation, logging, and optimize for performance:\n\n{code}"
            except Exception:
                # If file doesn't exist, treat as code
                prompt = f"Make this code production-ready. Add error handling, input validation, logging, and optimize for performance:\n\n{args}"
        else:
            prompt = f"Make this code production-ready. Add error handling, input validation, logging, and optimize for performance:\n\n{args}"
        
        response = ""
        async for chunk in ai_service.generate_response(prompt, model, False):
            response += chunk
        
        logger.log_chat(f"/production {args}", response, model or "default")
        return response

# Global command processor instance
command_processor = CommandProcessor()
