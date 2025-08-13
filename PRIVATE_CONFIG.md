# Private Configuration Setup

After deploying to Render, create a `.env.local` file with your actual URLs:

```bash
# Copy and update with your actual Render URL
cp .env.local.example .env.local

# Edit .env.local with your actual deployment URL
nano .env.local
```

**⚠️ Important: Never commit `.env.local` to git!**

## Quick Setup Commands

1. **For Ollama Server (local)**:
   ```bash
   cd ollama-server
   RENDER_SERVER_URL=wss://your-actual-url.onrender.com npm start
   ```

2. **For Chrome Extension**:
   - Open extension popup
   - Enter your actual Render URL: `https://your-actual-url.onrender.com`
   - Save settings

3. **For Testing**:
   - Update `websocket-test.html` with your actual URL
   - Update test scripts with your actual URL

## Security Notes

- All example files use placeholder URLs (`your-app.onrender.com`)
- Your actual deployment URL should only be in local configuration files
- Use environment variables for production deployments
