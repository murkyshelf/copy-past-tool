# Chrome Extension Configuration

## Setting Up the Extension with Your Render Server

After loading the Chrome extension, you need to configure it to connect to your deployed Render server.

### Steps:

1. **Install the Extension**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the `chrome-extension` folder

2. **Configure the Server URL**:
   - Click the extension icon in your Chrome toolbar
   - In the popup that opens, you'll see a "Server URL" field
   - Enter your Render server URL: `https://your-app.onrender.com`
   - Click "Save Settings"

3. **Test the Connection**:
   - Click "Test Connection" in the extension popup
   - You should see both HTTP and WebSocket connections as "Connected"
   - The status indicators should turn green

4. **Select AI Model**:
   - Choose your preferred model from the dropdown (default: qwen-coder)
   - Click "Save Settings"

### Usage:

Once configured:
1. **Copy any text** (code, error message, description)
2. **Press Ctrl+V** anywhere to paste AI-enhanced code
3. **Press Ctrl+Shift+V** to paste original content
4. **Monitor status** via the extension popup

### Troubleshooting:

- **Red status indicators**: Check your internet connection and server URL
- **Extension not working**: Make sure the server URL is correct and includes `https://`
- **No AI response**: Verify your Ollama server is running and connected
- **Connection failed**: The Render server might be sleeping; try again in a minute

### Default Configuration:

- **Server URL**: `https://your-app.onrender.com`
- **WebSocket URL**: `wss://your-app.onrender.com/ws`
- **Default Model**: `qwen-coder`
- **Timeout**: 30 seconds
- **Auto-retry**: 3 attempts

The extension will automatically fallback to HTTP if WebSocket connection fails.
