# Deploying to Render.com (with WebSocket Support)

This guide will help you deploy the AI Code Clipboard server to Render.com with WebSocket support for real-time communication.

## Prerequisites

1. A [Render.com](https://render.com) account
2. Your Ollama server running and accessible from the internet
3. The `render-server` folder from this project

## Step 1: Prepare Your Ollama Server (No Port Forwarding Needed!)

Your Ollama server will connect TO the Render server, so no port forwarding or firewall configuration is required!

### Option A: Run Locally (Recommended)
```bash
# Start your Ollama server with reverse connection
cd ollama-server
cp ollama-server-reverse.js ollama-server.js  # Use reverse connection version
npm start

# Set your Render server URL when deployed
RENDER_SERVER_URL=wss://your-app.onrender.com npm start
```

### Option B: Use a cloud server (Optional)
You can still deploy your Ollama server to a cloud provider, but it's not necessary since no incoming connections are needed.

### ~~Option C: Configure your router~~ (Not Needed!)
~~Set up port forwarding on your router to expose port 11435.~~
**Port forwarding is no longer needed!** Your Ollama server connects outbound to Render.

## Step 2: Deploy to Render

### Method 1: GitHub Repository (Recommended)

1. **Push to GitHub:**
   ```bash
   # Create a new repository on GitHub
   # Clone it locally and copy the render-server folder
   git clone https://github.com/yourusername/your-repo.git
   cp -r render-server/* your-repo/
   cd your-repo
   git add .
   git commit -m "Add AI clipboard server"
   git push origin main
   ```

2. **Create Render Service:**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your repository and branch

3. **Configure the Service:**
   - **Name:** `ai-clipboard-server` (or your preferred name)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free` (for testing) or `Starter` (for production)

### Method 2: Direct Upload

1. **Prepare the code:**
   ```bash
   cd render-server
   zip -r ai-clipboard-server.zip .
   ```

2. **Upload to Render:**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Choose "Deploy an existing image or upload code"
   - Upload your ZIP file

## Step 3: Configure Environment Variables

In your Render service settings, add these environment variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Set production mode |
| `API_KEY` | `your-secure-key-here` | Optional: for authentication |

### Example Environment Variables:
```
NODE_ENV=production
API_KEY=my-secret-api-key-2024
```

**Note**: `OLLAMA_SERVER_URL` is no longer needed since Ollama servers connect TO Render!

## Step 4: Deploy and Test

1. **Deploy:**
   - Click "Create Web Service"
   - Wait for the deployment to complete
   - Note your Render URL (e.g., `https://your-app.onrender.com`)

2. **Test the deployment:**
   ```bash
   # Test health endpoint
   curl https://your-app.onrender.com/health
   
   # Test WebSocket endpoint info
   curl https://your-app.onrender.com/ws
   
   # Test processing endpoint (HTTP fallback)
   curl -X POST https://your-app.onrender.com/process-clipboard \
     -H "Content-Type: application/json" \
     -d '{"content": "test code", "model": "qwen-coder"}'
   
   # Check connected Ollama servers
   curl https://your-app.onrender.com/ws-stats
   ```

3. **Connect your local Ollama server:**
   ```bash
   cd ollama-server
   RENDER_SERVER_URL=wss://your-app.onrender.com npm start
   
   # You should see: "✅ Connected to Render server successfully!"
   ```

## Step 5: Configure Chrome Extension

1. Open the Chrome extension popup
2. Enter your Render URL: `https://your-app.onrender.com`
3. Select your preferred AI model
4. Click "Save Settings"
5. Click "Test Connection" to verify

## Troubleshooting

### Common Issues:

**Deployment fails:**
- Check build logs in Render dashboard
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility

**Cannot connect to Ollama server:**
- Verify your Ollama server URL is correct and accessible
- Check firewall settings
- Test the URL manually in a browser

**CORS errors:**
- The server is configured to allow Chrome extension origins
- Check browser console for specific CORS errors

**WebSocket connection issues:**
- Verify WebSocket endpoint is accessible: `wss://your-app.onrender.com/ws`
- Check if Render supports WebSockets (it does!)
- Monitor WebSocket connection status in extension popup
- WebSocket will automatically fallback to HTTP if connection fails

**Timeout errors:**
- Increase timeout values in the server code
- Consider using a faster instance type on Render

### Environment Variable Updates:

If you need to update environment variables:
1. Go to your Render service dashboard
2. Click "Environment"
3. Update the variables
4. The service will automatically redeploy

### Logs and Debugging:

- View logs in Render dashboard under "Logs" tab
- Check for errors during startup
- Monitor API requests and responses

## Security Considerations

1. **Use HTTPS:** Render provides HTTPS by default
2. **API Keys:** Consider adding authentication for production
3. **Rate Limiting:** The server includes rate limiting
4. **Input Validation:** All inputs are validated

## Scaling

For production use:
- Upgrade to a paid Render plan for better performance
- Consider using a dedicated server for your Ollama instance
- Implement proper logging and monitoring
- Set up alerts for service health

## Cost Optimization

- **Free Tier:** Render's free tier is sufficient for testing
- **Starter Plan:** $7/month for better performance and uptime
- **Ollama Server:** Can run on a small VPS (~$5-10/month)

## Next Steps

After successful deployment:
1. Test the complete workflow end-to-end
2. Share the extension with team members
3. Monitor usage and performance
4. Consider adding more AI models or features

---

**Need help?** Check the main README.md or create an issue in the repository.
