# Jarvis Coder - AI-Powered Development Environment

Jarvis Coder is a comprehensive AI-powered development environment that combines the power of modern AI assistants with a full-featured code editor, terminal, and workspace management system. It supports both online and offline AI providers, making it perfect for developers who need intelligent coding assistance.

## 🚀 Features

### AI-Powered Assistance
- **Dual Mode Support**: Choose between online AI providers (OpenAI) or offline local models (Ollama)
- **Smart Command Processing**: Natural language commands for code generation, explanation, and fixes
- **Multi-Provider Support**: Auto-detection of the best available AI provider
- **Streaming Responses**: Real-time AI responses with typing animation

### Development Environment
- **Monaco Editor**: Full-featured code editor with syntax highlighting and IntelliSense
- **Split-View Layout**: Terminal and editor side-by-side for efficient workflow
- **File Explorer**: Navigate and manage your workspace files
- **Code Execution**: Run Python, JavaScript, and shell code directly from the editor
- **Project Templates**: Quick-start templates for React, Next.js, Django, FastAPI, and more

### Command Line Interface
- **Interactive REPL**: Command-line interface with autocomplete
- **Rich Output**: Syntax highlighting and formatted output
- **Workspace Integration**: Full access to file operations and AI commands

### Security & Reliability
- **Secure Logging**: Prevents code leaks in logs while maintaining audit trails
- **Error Handling**: Robust error handling and graceful degradation
- **Configuration Management**: Environment-based configuration system

## 🛠️ Installation

### Prerequisites
- Python 3.8+
- Node.js 14+
- Ollama (for offline mode)
- OpenAI API key (for online mode)

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
```

### Frontend Setup
```bash
cd frontend
npm install
```

### CLI Setup
```bash
cd cli
pip install -r requirements.txt
```

## ⚙️ Configuration

Create a `.env` file in the backend directory:

```env
# Server Configuration
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:8000

# AI Configuration
AI_MODE=auto  # auto, online, or offline
OPENAI_API_KEY=your_openai_api_key_here
OLLAMA_MODEL=gpt-oss:20b

# Workspace Configuration
WORKSPACE_DIR=./workspace
LOG_LEVEL=INFO
```

## 🚀 Usage

### Starting the Backend
```bash
cd backend
python main.py
```

### Starting the Frontend
```bash
cd frontend
npm start
```

### Using the CLI
```bash
cd cli
python jarvis_cli.py
```

## 📋 Available Commands

### AI Commands
- `/chat [message]` - Chat with Jarvis AI
- `/code [description]` - Generate code from description
- `/explain [code]` - Explain code functionality
- `/fix [code]` - Fix broken code
- `/templates` - List available project templates

### File Operations
- `/save [file] [code]` - Save code to file
- `/files` - List files in workspace
- `/read [file]` - Read file content

### Project Management
- `/new [type] [name]` - Create new project (react, nextjs, django, etc.)
- `/run [command]` - Run code or command
- `/deploy` - Generate deployment configuration
- `/git [command]` - Git operations

## 🏗️ Project Structure

```
jarvis-coder/
├── backend/
│   ├── api/
│   │   ├── chat.py          # Chat API endpoints
│   │   └── execute.py       # Code execution endpoints
│   ├── services/
│   │   ├── ai_service.py    # AI provider management
│   │   ├── command_processor.py # Command processing
│   │   ├── workspace_service.py # File operations
│   │   └── logging_service.py   # Secure logging
│   ├── config.py           # Configuration management
│   └── main.py            # FastAPI application
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Terminal.js     # Terminal component
│   │   │   ├── CodeEditor.js   # Monaco editor
│   │   │   └── FileExplorer.js # File browser
│   │   └── App.js          # Main React component
│   └── package.json        # Frontend dependencies
├── cli/
│   ├── jarvis_cli.py       # Command-line interface
│   └── requirements.txt    # CLI dependencies
└── workspace/              # Default workspace directory
```

## 🔧 API Endpoints

### Chat API
- `POST /api/chat` - Send chat message to AI
- `POST /api/chat/stream` - Stream chat responses

### File API
- `GET /api/files` - List workspace files
- `GET /api/files/{path}` - Read file content

### Execution API
- `POST /api/execute` - Execute code snippets

## 🎯 Examples

### Generate Code
```
/code create a Python function that calculates factorial
```

### Explain Code
```
/explain def factorial(n): return 1 if n == 0 else n * factorial(n-1)
```

### Create Project
```
/new react my-app
```

### Save Code
```
/save factorial.py def factorial(n): return 1 if n == 0 else n * factorial(n-1)
```

## 🛡️ Security Features

- **Secure Logging**: Code blocks are sanitized in logs to prevent leaks
- **Input Validation**: All inputs are validated and sanitized
- **Error Handling**: Comprehensive error handling prevents crashes
- **CORS Protection**: Proper CORS configuration for web security

## 🚧 Development

### Adding New AI Providers
1. Extend `ai_service.py` with new provider class
2. Implement the `generate_response` method
3. Update configuration to support the new provider

### Adding New Commands
1. Extend `command_processor.py` with new command handler
2. Add to the command registry
3. Update CLI and frontend to support the command

### Customizing Templates
1. Modify `workspace_service.py` template methods
2. Add new project types to the templates dictionary
3. Update documentation

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the example usage

## 📊 Performance

- **Response Time**: < 2 seconds for most AI responses
- **Memory Usage**: Optimized for both development and production
- **Scalability**: Designed to handle multiple concurrent users

## 🎨 Customization

- **Themes**: Customize the editor and UI themes
- **Keybindings**: Custom keyboard shortcuts
- **Plugins**: Extend functionality with custom plugins

---

**Jarvis Coder** - Your AI-powered development companion! 🚀
