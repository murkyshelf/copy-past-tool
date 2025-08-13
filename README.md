# AI Code Clipboard

A Chrome extension that enhances your copy-paste workflow with AI code generation using real-time WebSocket communication. Copy any text, and get AI-improved code when you paste!

## 🏗️ Architecture

The project uses a reverse WebSocket connection architecture to avoid port forwarding:

1. **Chrome Extension** - Monitors clipboard and handles paste operations
2. **Render Server** - Deployed on Render.com, acts as WebSocket hub
3. **Local Ollama Server** - Connects TO Render server (no port forwarding needed!)

```
[Chrome Extension] ←→ WebSocket ←→ [Render Server] ←→ WebSocket ←→ [Your Local Ollama Server]
                                        ↑
                                   WebSocket Hub
                              (No port forwarding!)
```

**Key Benefit**: Your local Ollama server initiates the connection to Render, so no firewall/router configuration needed!

## 🚀 Quick Start

### 1. Setup Local Ollama Server (No Port Forwarding!)

```bash
cd ollama-server
npm install
npm run setup  # This will install Ollama and required models

# Switch to reverse connection mode (no port forwarding needed)
npm run switch-mode  # Select option 1

# Start with your Render server URL
RENDER_SERVER_URL=wss://your-app.onrender.com npm start
```

**🎉 No port forwarding, no router configuration, no firewall issues!**

### 2. Deploy Render Server

1. Create a new Web Service on [Render.com](https://render.com)
2. Connect your GitHub repository or upload the `render-server` folder
3. Set environment variables:
   ```
   OLLAMA_SERVER_URL=http://your-server-ip:11435
   ```
4. Deploy the service (includes WebSocket support automatically)

### 3. Install Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `chrome-extension` folder
4. Configure the extension with your Render server URL

## 📋 Features

### Chrome Extension Features
- **Real-time WebSocket Communication** - Instant feedback and status updates
- **Automatic Clipboard Monitoring** - Detects when you copy text
- **Smart Paste** - Use `Ctrl+V` for AI-enhanced code or `Ctrl+Shift+V` for original
- **Model Selection** - Choose between Qwen Coder, CodeLlama, etc.
- **Connection Status** - Visual indicators for HTTP and WebSocket connections
- **Automatic Fallback** - Falls back to HTTP if WebSocket fails

### AI Code Generation
- **Real-time Processing** - Live feedback during code generation
- **Error Fixing** - Automatically fixes code errors
- **Code Optimization** - Improves existing code
- **Implementation Generation** - Converts descriptions to code
- **Multiple Models** - Support for various coding AI models
- **Streaming Responses** - See code being generated in real-time (WebSocket)

## 🔧 Configuration

### Extension Settings
- **Server URL**: Your Render deployment URL
- **AI Model**: Choose your preferred coding model
- **Auto-processing**: Enable/disable automatic clipboard processing
- **WebSocket Connection**: Real-time communication status indicator

### Server Configuration
- **Model Management**: Install and manage AI models
- **Rate Limiting**: Configurable request limits
- **CORS Settings**: Secure cross-origin requests
- **WebSocket Support**: Real-time bidirectional communication
- **Connection Monitoring**: Track active WebSocket connections

## 📖 Usage

1. **Copy any text** (code, error message, or description)
2. **Navigate to where you want to paste**
3. **Press Ctrl+V** - Pastes AI-enhanced code (real-time via WebSocket)
4. **Press Ctrl+Shift+V** - Pastes original content

### Real-time Features
- **Live Status Updates** - See connection status in extension popup
- **Instant Processing** - WebSocket provides immediate feedback
- **Progress Indicators** - Watch AI code generation in real-time
- **Automatic Reconnection** - Seamless recovery from connection issues

### Example Workflows

**Error Fixing:**
```
Copy: "TypeError: Cannot read property 'name' of undefined"
Paste: Fixed code with proper null checking
```

**Code Enhancement:**
```
Copy: "function add(a, b) { return a + b; }"
Paste: Enhanced function with type checking and documentation
```

**Implementation Generation:**
```
Copy: "Create a function that validates email addresses"
Paste: Complete email validation function
```

## 🛠️ Development

### Chrome Extension Development
```bash
cd chrome-extension
# Make changes to the files
# Reload extension in chrome://extensions/
# Monitor WebSocket connection in popup
```

### Render Server Development
```bash
cd render-server
npm install
npm run dev  # Start with nodemon for auto-reload
# WebSocket endpoint available at ws://localhost:3000/ws
```

### Ollama Server Development
```bash
cd ollama-server
npm install
npm run dev  # Start with nodemon for auto-reload
# WebSocket endpoint available at ws://localhost:11435/ws
```

### Testing WebSocket Connections
```bash
# Use the built-in test page
open websocket-test.html

# Or use command line tools
npm install -g wscat
wscat -c ws://localhost:3000/ws      # Test Render server
wscat -c ws://localhost:11435/ws     # Test Ollama server

# Run automated tests
./test.sh
```

## 🔒 Security

- **Real-time Encryption** - WebSocket connections use WSS (secure WebSocket)
- **Rate Limiting** - Prevents abuse of AI generation
- **CORS Protection** - Secure cross-origin requests
- **Input Validation** - Sanitizes all inputs
- **No Data Storage** - Clipboard content is not permanently stored
- **Connection Authentication** - Optional API key support

## 🧪 Testing

### Test the Extension
1. Copy some text
2. Check if it appears in the extension popup
3. Verify WebSocket connection status (green = connected)
4. Try pasting in a text field

### Test the Servers
```bash
# Test Render Server
curl -X POST https://your-app.render.com/test -H "Content-Type: application/json" -d '{"test": "data"}'

# Test Ollama Server
curl -X POST http://localhost:11435/test -H "Content-Type: application/json" -d '{"test": "data"}'

# Test WebSocket endpoints
curl https://your-app.render.com/ws
curl http://localhost:11435/ws

# Interactive WebSocket testing
open websocket-test.html
```

### WebSocket Testing Tools
- **Built-in Test Page**: `websocket-test.html` - Browser-based testing
- **Command Line**: `wscat -c ws://localhost:3000/ws`
- **Extension Popup**: Real-time connection status
- **Automated Tests**: `./test.sh` - Complete system testing

## 🚨 Troubleshooting

### Common Issues

**Extension not working:**
- Check if the extension is enabled
- Verify server URL in extension settings
- Check browser console for errors
- Monitor WebSocket connection status in popup

**WebSocket connection issues:**
- Check if WebSocket endpoint is accessible
- Verify WSS/WS protocol matches server setup
- Extension automatically falls back to HTTP if WebSocket fails
- Use websocket-test.html for debugging

**Ollama connection issues:**
- Ensure Ollama service is running: `ollama serve`
- Check if models are installed: `ollama list`
- Verify firewall settings

**Render deployment issues:**
- Check environment variables
- Verify build logs
- Ensure your server IP is accessible from Render
- Test WebSocket connectivity separately

### Debug Mode
Enable debug logging by setting:
```javascript
// In extension background.js
const DEBUG = true;
```

### WebSocket Debugging
- Use browser DevTools → Network → WS to monitor WebSocket traffic
- Check extension popup for connection status
- Test with websocket-test.html for isolated debugging
- Monitor server logs for WebSocket connection events

## 📝 API Documentation

### Render Server Endpoints

#### POST /process-clipboard
Process clipboard content and generate AI code (HTTP fallback).

**Request:**
```json
{
  "content": "text content",
  "model": "qwen-coder",
  "timestamp": 1640995200000
}
```

**Response:**
```json
{
  "success": true,
  "aiCode": "generated code",
  "model": "qwen-coder",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

#### GET /health
Check server health and connection to Ollama.

#### WebSocket /ws
Real-time communication endpoint.

**Message Types:**
- `process_clipboard` - Send content for AI processing
- `connection` - Establish connection with model preference
- `ping` - Connection keep-alive

### Ollama Server Endpoints

#### POST /generate
Generate code using Ollama models (HTTP).

#### GET /models
List available and installed models.

#### POST /install-model
Install a new AI model.

#### WebSocket /ws
Real-time code generation endpoint.

**Message Types:**
- `generate_code` - Request code generation
- `set_model` - Change AI model
- `ping` - Connection health check

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use and modify as needed.

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review server logs
3. Test each component individually
4. Check network connectivity between components
5. Use websocket-test.html for WebSocket debugging
6. Monitor connection status in extension popup
7. Verify WebSocket endpoints are accessible

## 🌟 New WebSocket Features

### Real-time Communication
- **Instant feedback** when copying text
- **Live progress updates** during AI code generation
- **Connection status monitoring** in extension popup
- **Automatic reconnection** with exponential backoff

### Enhanced Performance
- **Persistent connections** - No HTTP overhead per request
- **Bidirectional communication** - Server can push updates
- **Reduced latency** - Immediate response to clipboard changes
- **Graceful degradation** - Falls back to HTTP if WebSocket fails

### Developer Tools
- **WebSocket test page** (`websocket-test.html`)
- **Real-time debugging** with browser DevTools
- **Connection statistics** at `/ws-stats` endpoint
- **Automated testing** with enhanced test suite

---

**Happy coding with AI assistance! 🚀**
