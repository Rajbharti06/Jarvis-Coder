# 🚀 Jarvis Terminal - Warp-Style AI Terminal IDE

A next-generation terminal IDE that combines the power of Warp's interface with advanced AI capabilities. Built with React, FastAPI, and support for multiple AI providers including OpenAI, Anthropic, Google, Perplexity, and local models via Ollama.

![Jarvis Terminal](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Python](https://img.shields.io/badge/Python-3.11+-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18+-blue)

## ✨ Features

### 🎨 **Warp-Style Interface**
- **Glassmorphic Design**: Beautiful, modern UI with glass-like transparency effects
- **Advanced Terminal**: xterm.js-based terminal with syntax highlighting and autocomplete
- **Real-time Streaming**: Live AI responses with streaming support
- **Command Suggestions**: Intelligent command autocomplete and suggestions
- **Multi-pane Layout**: Split-screen interface for code and terminal

### 🤖 **AI Integration**
- **Multiple Providers**: OpenAI, Anthropic, Google AI, Perplexity, Groq, Mistral
- **Local Models**: Ollama integration for offline AI capabilities
- **Intelligent Routing**: Automatic model selection based on task type
- **Context Awareness**: AI understands your codebase and project structure
- **Code Analysis**: Real-time code suggestions and error detection

### 🔒 **Security & Privacy**
- **Encrypted Storage**: API keys are encrypted using Fernet encryption
- **Offline Mode**: Full functionality without internet connection
- **Secure Execution**: Sandboxed command execution with safety checks
- **No Data Collection**: Your code never leaves your machine unless you choose to

### ⚡ **Performance**
- **Fast Response Times**: Optimized for speed with intelligent caching
- **Resource Efficient**: Minimal memory footprint and CPU usage
- **Concurrent Processing**: Handle multiple AI requests simultaneously
- **Smart Caching**: Intelligent caching of AI responses and context

## 🛠️ Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git
- Docker (optional, for containerized deployment)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/jarvis-terminal.git
   cd jarvis-terminal
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   pip install -r requirements.txt
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Start the services**
   ```bash
   # Terminal 1 - Backend
   cd backend
   uvicorn main:create_application --reload --host 0.0.0.0 --port 8000
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

5. **Access the application**
   - Open http://localhost:3000 in your browser
   - Start using Jarvis Terminal!

### Docker Deployment

1. **Using Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Ollama: http://localhost:11434

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Application Settings
JARVIS_MODE=hybrid  # auto, offline, online
DEFAULT_MODEL=gpt-4o
ENCRYPTION_SECRET=your-super-secret-key-for-encryption-32-bytes-long
JWT_SECRET_KEY=your-jwt-secret-key

# Database
DB_URL=sqlite:///./jarvis_coder.db
WORKSPACE_DIR=./workspace

# API Keys (optional)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_AI_KEY=your-google-ai-key
PERPLEXITY_API_KEY=your-perplexity-api-key
GROQ_API_KEY=your-groq-api-key
MISTRAL_API_KEY=your-mistral-api-key
```

### API Key Management

1. **Via UI**: Use the API Key Manager in the terminal interface
2. **Via Environment**: Set API keys in your `.env` file
3. **Via API**: Use the `/api/keys` endpoints

## 🚀 Usage

### Basic Commands

```bash
# AI Mode
@ai                    # Toggle AI mode
@ai help me debug this # Ask AI for help

# Terminal Commands
/help                  # Show help
/clear                 # Clear terminal
/history               # Show command history
/explain ls            # Explain a command

# Special Features
Ctrl+L                 # Clear terminal
Ctrl+R                 # Toggle AI mode
Tab                    # Autocomplete
↑/↓                    # Command history
```

### AI Capabilities

- **Code Generation**: Generate code in any language
- **Debugging**: Help debug errors and issues
- **Code Review**: Review and improve your code
- **Documentation**: Generate documentation and comments
- **Refactoring**: Suggest code improvements
- **Testing**: Generate unit tests and test cases

### Model Switching

- **Auto Mode**: Automatically selects the best model for each task
- **Offline Mode**: Uses only local Ollama models
- **Online Mode**: Uses only API-based models
- **Manual Selection**: Choose specific models for different tasks

## 🏗️ Architecture

### Backend (FastAPI)
```
backend/
├── api/                 # API endpoints
│   ├── models.py       # Model management
│   ├── keys.py         # API key management
│   ├── chat.py         # Chat endpoints
│   └── terminal.py     # Terminal execution
├── services/           # Business logic
│   ├── llm_router.py   # AI model routing
│   ├── ai_service.py   # AI service layer
│   └── terminal_service.py # Terminal service
├── core/               # Core functionality
│   ├── config.py       # Configuration
│   └── security.py     # Security utilities
└── main.py            # FastAPI application
```

### Frontend (React + TypeScript)
```
frontend/
├── src/
│   ├── components/     # React components
│   │   ├── Terminal/   # Terminal components
│   │   ├── AI/         # AI-related components
│   │   └── UI/         # UI components
│   ├── services/       # API services
│   ├── hooks/          # Custom React hooks
│   └── utils/          # Utility functions
├── public/             # Static assets
└── package.json        # Dependencies
```

## 🔌 API Reference

### Models API
- `GET /api/models` - Get available models
- `GET /api/models/{model_id}` - Get model details
- `POST /api/models/{model_id}/test` - Test a model
- `POST /api/mode` - Set operation mode

### Keys API
- `GET /api/keys` - Get provider status
- `POST /api/keys` - Update API key
- `DELETE /api/keys` - Remove API key
- `POST /api/test-connection` - Test connection

### Terminal API
- `POST /terminal/execute` - Execute command
- `GET /terminal/sessions` - Get active sessions
- `WebSocket /terminal/ws/{session_id}` - Real-time terminal

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Style

- **Python**: Follow PEP 8
- **TypeScript**: Use ESLint and Prettier
- **Commits**: Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Warp**: Inspiration for the terminal interface design
- **xterm.js**: Terminal emulator library
- **FastAPI**: Modern Python web framework
- **React**: Frontend framework
- **Ollama**: Local AI model runner

## 📞 Support

- **Documentation**: [Wiki](https://github.com/yourusername/jarvis-terminal/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/jarvis-terminal/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/jarvis-terminal/discussions)
- **Discord**: [Join our Discord](https://discord.gg/your-discord)

## 🗺️ Roadmap

### Version 1.1
- [ ] Voice commands
- [ ] Plugin system
- [ ] Advanced code analysis
- [ ] Team collaboration features

### Version 1.2
- [ ] Mobile app
- [ ] Cloud sync
- [ ] Advanced AI features
- [ ] Performance optimizations

### Version 2.0
- [ ] Multi-language support
- [ ] Advanced debugging tools
- [ ] Integration with popular IDEs
- [ ] Enterprise features

---

**Made with ❤️ by the Jarvis Terminal Team**

*Transform your terminal into an intelligent development environment.*
