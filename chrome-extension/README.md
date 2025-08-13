# AI Code Clipboard Extension

This Chrome extension enhances your copy-paste workflow with AI code generation.

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select this folder
4. The extension icon should appear in your toolbar

## Configuration

1. Click the extension icon in the toolbar
2. Enter your Render server URL (e.g., `https://your-app.render.com`)
3. Select your preferred AI model
4. Click "Save Settings"
5. Test the connection

## Usage

### Automatic Mode (Recommended)
1. Copy any text (code, error message, or description)
2. Navigate to where you want to paste
3. Press `Ctrl+V` (or `Cmd+V` on Mac) - Pastes AI-enhanced code
4. Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac) - Pastes original content

### Manual Mode
1. Copy text
2. Open the extension popup to see the content
3. Click "Force Sync" if needed
4. Use regular paste operations

## Features

- 🔄 **Automatic clipboard monitoring**
- 🤖 **AI code generation and enhancement**
- 🔧 **Error fixing and code optimization**
- 📝 **Description to code conversion**
- ⚡ **Multiple AI model support**
- 🎯 **Smart paste detection**

## Keyboard Shortcuts

- `Ctrl+V` / `Cmd+V`: Paste AI-enhanced code
- `Ctrl+Shift+V` / `Cmd+Shift+V`: Paste original content

## Permissions

This extension requires the following permissions:

- **clipboardRead**: To monitor clipboard changes
- **clipboardWrite**: To provide enhanced paste functionality
- **storage**: To save your settings
- **activeTab**: To interact with web pages
- **host_permissions**: To communicate with your server

## Privacy

- Clipboard content is only sent to your configured server
- No data is stored permanently
- All processing happens on your own servers
- The extension follows Chrome's security guidelines

## Troubleshooting

### Extension not working
1. Check if the extension is enabled in `chrome://extensions/`
2. Verify the server URL in extension settings
3. Test the server connection using the "Test Connection" button
4. Check the browser console for errors (F12 → Console)

### Server connection issues
1. Ensure your Render server is deployed and running
2. Check that your Ollama server is accessible
3. Verify firewall settings
4. Test the server endpoints manually

### Clipboard not being detected
1. Make sure you're copying text (not images or files)
2. Try using "Force Sync Clipboard" in the popup
3. Check that clipboard permissions are granted
4. Some websites may block clipboard access

## Development

To modify the extension:

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh button on the extension card
4. Test your changes

### File Structure

- `manifest.json` - Extension configuration
- `background.js` - Service worker for clipboard monitoring
- `content.js` - Script injected into web pages
- `popup.html/js` - Extension popup interface

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the main project README.md
3. Check server logs for errors
4. Test each component individually
