const express = require('express');
const cors = require('cors');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const WebSocket = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['chrome-extension://*', 'http://localhost:*', 'https://*.render.com'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Configuration
const OLLAMA_SERVER_URL = process.env.OLLAMA_SERVER_URL || 'http://localhost:11434';
const API_KEY = process.env.API_KEY || 'your-api-key'; // For authentication if needed

// Store for pending requests (in production, use Redis or similar)
const pendingRequests = new Map();
const connectedClients = new Map(); // Store Chrome extension connections
const ollamaServers = new Map(); // Store Ollama server connections

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    server: 'render-ai-clipboard'
  });
});

// Main endpoint to process clipboard content
app.post('/process-clipboard', async (req, res) => {
  try {
    const { content, model = 'qwen-coder', timestamp } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    console.log(`Processing clipboard content for model: ${model}`);
    console.log(`Content preview: ${content.substring(0, 100)}...`);

    // Send to your Ollama server
    const aiCode = await generateCode(content, model);
    
    res.json({
      success: true,
      aiCode: aiCode,
      model: model,
      timestamp: new Date().toISOString(),
      originalContent: content.substring(0, 100) + '...'
    });

  } catch (error) {
    console.error('Error processing clipboard:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Generate code using Ollama
async function generateCode(content, model) {
  try {
    const prompt = createPrompt(content);
    
    // First try to connect to your custom Ollama server
    const response = await axios.post(`${OLLAMA_SERVER_URL}/generate`, {
      content: content,
      model: model,
      temperature: 0.3,
      maxTokens: 2000
    }, {
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.success && response.data.code) {
      return response.data.code;
    } else {
      throw new Error('Invalid response from your Ollama server');
    }

  } catch (error) {
    console.error('Error generating code with custom server:', error.message);
    
    // Fallback: try direct Ollama connection
    try {
      const directResponse = await axios.post(`${OLLAMA_SERVER_URL.replace(':11435', ':11434')}/api/generate`, {
        model: model === 'qwen-coder' ? 'qwen2.5-coder:7b' : model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          num_predict: 2000
        }
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (directResponse.data && directResponse.data.response) {
        return cleanCode(directResponse.data.response);
      }
    } catch (directError) {
      console.error('Direct Ollama connection also failed:', directError.message);
    }
    
    // Final fallback: return enhanced version of original content
    return enhanceContent(content);
  }
}

// Create appropriate prompt based on content
function createPrompt(content) {
  // Detect content type
  const isCode = detectCodeContent(content);
  const hasError = content.toLowerCase().includes('error') || 
                  content.toLowerCase().includes('exception') ||
                  content.toLowerCase().includes('failed');
  
  if (isCode && hasError) {
    return `You are a helpful coding assistant. The user has copied some code or error message. Please analyze it and provide a corrected or improved version. Only return the code, no explanations unless absolutely necessary.

Content: ${content}

Please provide clean, working code:`;
  } else if (isCode) {
    return `You are a helpful coding assistant. The user has copied some code. Please optimize, clean up, or improve this code. Only return the code, no explanations unless absolutely necessary.

Code: ${content}

Improved version:`;
  } else {
    return `You are a helpful coding assistant. The user has copied some text that might be a description, comment, or specification. Please convert this into clean, functional code. Only return the code, no explanations unless absolutely necessary.

Description: ${content}

Code implementation:`;
  }
}

// Detect if content looks like code
function detectCodeContent(content) {
  const codeIndicators = [
    /function\s+\w+\s*\(/,
    /class\s+\w+/,
    /import\s+.*from/,
    /const\s+\w+\s*=/,
    /let\s+\w+\s*=/,
    /var\s+\w+\s*=/,
    /def\s+\w+\s*\(/,
    /public\s+class/,
    /private\s+\w+/,
    /\{.*\}/s,
    /\[.*\]/s,
    /.*\(\)\s*{/,
    /.*;\s*$/m
  ];
  
  return codeIndicators.some(pattern => pattern.test(content));
}

// Clean and format generated code
function cleanCode(code) {
  // Remove common AI response prefixes/suffixes
  code = code.replace(/^(Here's|Here is|The code is|The implementation is|Here's the|Here is the).*?:\s*/i, '');
  code = code.replace(/```[\w]*\n?/g, ''); // Remove code block markers
  code = code.replace(/^```|```$/g, '');
  
  // Trim whitespace
  code = code.trim();
  
  return code;
}

// Fallback enhancement for original content
function enhanceContent(content) {
  // Simple fallback - just return cleaned up version
  return content.trim();
}

// Endpoint to get server status
app.get('/status', async (req, res) => {
  try {
    // Test connection to Ollama server
    const ollamaResponse = await axios.get(`${OLLAMA_SERVER_URL}/api/tags`, {
      timeout: 5000
    });
    
    res.json({
      renderServer: 'online',
      ollamaServer: 'connected',
      availableModels: ollamaResponse.data.models || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      renderServer: 'online',
      ollamaServer: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint
app.post('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Server is working',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  const url = req.url;
  
  // Route connections based on URL path
  if (url === '/ollama' || url.includes('/ollama')) {
    handleOllamaConnection(ws, clientId);
  } else {
    handleClientConnection(ws, clientId);
  }
});

// Handle Chrome extension connections
function handleClientConnection(ws, clientId) {
  connectedClients.set(clientId, {
    ws: ws,
    id: clientId,
    type: 'client',
    connectedAt: new Date(),
    lastActivity: new Date(),
    model: 'qwen-coder'
  });

  console.log(`Chrome extension connected: ${clientId}`);
  console.log(`Total clients: ${connectedClients.size}, Ollama servers: ${ollamaServers.size}`);

  ws.send(JSON.stringify({
    type: 'connection_established',
    clientId: clientId,
    timestamp: new Date().toISOString()
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      const client = connectedClients.get(clientId);
      
      if (client) {
        client.lastActivity = new Date();
      }

      await handleClientMessage(ws, clientId, data);
    } catch (error) {
      console.error('Error handling client message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  });

  ws.on('close', () => {
    console.log(`Chrome extension disconnected: ${clientId}`);
    connectedClients.delete(clientId);
  });

  ws.on('error', (error) => {
    console.error(`Client WebSocket error ${clientId}:`, error);
    connectedClients.delete(clientId);
  });
}

// Handle Ollama server connections
function handleOllamaConnection(ws, serverId) {
  ollamaServers.set(serverId, {
    ws: ws,
    id: serverId,
    type: 'ollama',
    connectedAt: new Date(),
    lastActivity: new Date(),
    availableModels: [],
    defaultModel: 'qwen-coder'
  });

  console.log(`Ollama server connected: ${serverId}`);
  console.log(`Total clients: ${connectedClients.size}, Ollama servers: ${ollamaServers.size}`);

  ws.send(JSON.stringify({
    type: 'ollama_connection_established',
    serverId: serverId,
    timestamp: new Date().toISOString()
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      const server = ollamaServers.get(serverId);
      
      if (server) {
        server.lastActivity = new Date();
      }

      await handleOllamaMessage(ws, serverId, data);
    } catch (error) {
      console.error('Error handling Ollama message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  });

  ws.on('close', () => {
    console.log(`Ollama server disconnected: ${serverId}`);
    ollamaServers.delete(serverId);
  });

  ws.on('error', (error) => {
    console.error(`Ollama WebSocket error ${serverId}:`, error);
    ollamaServers.delete(serverId);
  });
}

// Handle WebSocket messages
async function handleWebSocketMessage(ws, clientId, data) {
  // This is now handleClientMessage
  await handleClientMessage(ws, clientId, data);
}

// Handle messages from Chrome extension
async function handleClientMessage(ws, clientId, data) {
  const client = connectedClients.get(clientId);
  
  switch (data.type) {
    case 'connection':
      if (client && data.model) {
        client.model = data.model;
      }
      ws.send(JSON.stringify({
        type: 'connection_confirmed',
        model: data.model,
        availableOllamaServers: ollamaServers.size,
        timestamp: new Date().toISOString()
      }));
      break;

    case 'process_clipboard':
      if (!data.content || data.content.trim().length === 0) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Content is required',
          timestamp: new Date().toISOString()
        }));
        return;
      }

      // Send processing status
      ws.send(JSON.stringify({
        type: 'processing_status',
        status: 'started',
        timestamp: new Date().toISOString()
      }));

      try {
        console.log(`Processing clipboard content for client ${clientId}, model: ${data.model || client.model}`);
        
        // Route to available Ollama server
        const aiCode = await routeToOllamaServer(data.content, data.model || client.model, clientId);
        
        ws.send(JSON.stringify({
          type: 'ai_code_generated',
          success: true,
          aiCode: aiCode,
          model: data.model || client.model,
          originalContent: data.content.substring(0, 100) + '...',
          timestamp: new Date().toISOString()
        }));

      } catch (error) {
        console.error('Error processing clipboard via WebSocket:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to generate AI code',
          details: error.message,
          timestamp: new Date().toISOString()
        }));
      }
      break;

    case 'ping':
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString()
      }));
      break;

    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Unknown message type',
        timestamp: new Date().toISOString()
      }));
  }
}

// Handle messages from Ollama servers
async function handleOllamaMessage(ws, serverId, data) {
  const server = ollamaServers.get(serverId);
  
  switch (data.type) {
    case 'ollama_server_register':
      if (server) {
        server.availableModels = data.availableModels || [];
        server.defaultModel = data.defaultModel || 'qwen-coder';
        console.log(`Ollama server ${serverId} registered with models:`, server.availableModels);
      }
      
      ws.send(JSON.stringify({
        type: 'registration_confirmed',
        serverId: serverId,
        timestamp: new Date().toISOString()
      }));
      break;

    case 'generation_complete':
      // Forward result to waiting client
      const requestId = data.requestId;
      const clientWs = pendingRequests.get(requestId);
      
      if (clientWs) {
        clientWs.send(JSON.stringify({
          type: 'ai_code_generated',
          success: true,
          aiCode: data.code,
          model: data.model,
          originalContent: data.originalContent,
          timestamp: new Date().toISOString()
        }));
        pendingRequests.delete(requestId);
      }
      break;

    case 'generation_error':
      // Forward error to waiting client
      const errorRequestId = data.requestId;
      const errorClientWs = pendingRequests.get(errorRequestId);
      
      if (errorClientWs) {
        errorClientWs.send(JSON.stringify({
          type: 'error',
          message: 'AI generation failed',
          details: data.error,
          timestamp: new Date().toISOString()
        }));
        pendingRequests.delete(errorRequestId);
      }
      break;

    case 'ollama_server_disconnect':
      console.log(`Ollama server ${serverId} disconnecting gracefully`);
      break;

    case 'pong':
      // Handle keep-alive
      break;

    default:
      console.log('Unknown message type from Ollama server:', data.type);
  }
}

// Route requests to available Ollama servers
async function routeToOllamaServer(content, model, clientId) {
  // Find available Ollama server
  const availableServers = Array.from(ollamaServers.values()).filter(
    server => server.ws.readyState === WebSocket.OPEN
  );
  
  if (availableServers.length === 0) {
    throw new Error('No Ollama servers available');
  }
  
  // Use first available server (could implement load balancing here)
  const selectedServer = availableServers[0];
  const requestId = uuidv4();
  
  // Store client reference for response routing
  const client = connectedClients.get(clientId);
  if (client) {
    pendingRequests.set(requestId, client.ws);
  }
  
  // Send request to Ollama server
  selectedServer.ws.send(JSON.stringify({
    type: 'generate_code_request',
    requestId: requestId,
    content: content,
    model: model,
    options: {
      temperature: 0.3,
      max_tokens: 2000
    },
    timestamp: Date.now()
  }));
  
  // Return promise that resolves when response comes back
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('Request timeout'));
    }, 60000); // 60 second timeout
    
    // Store resolver for when response comes back
    pendingRequests.set(requestId + '_resolve', (result) => {
      clearTimeout(timeout);
      pendingRequests.delete(requestId);
      pendingRequests.delete(requestId + '_resolve');
      resolve(result);
    });
  });
}

// Clean up inactive connections periodically
setInterval(() => {
  const now = new Date();
  const timeoutMs = 5 * 60 * 1000; // 5 minutes

  for (const [clientId, client] of connectedClients.entries()) {
    if (now - client.lastActivity > timeoutMs) {
      console.log(`Closing inactive connection: ${clientId}`);
      client.ws.close();
      connectedClients.delete(clientId);
    }
  }
}, 60000); // Check every minute

// Broadcast to all connected clients (utility function)
function broadcastToAll(message) {
  const messageStr = JSON.stringify(message);
  connectedClients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

// Get WebSocket stats endpoint
app.get('/ws-stats', (req, res) => {
  const stats = {
    connectedClients: connectedClients.size,
    clients: Array.from(connectedClients.values()).map(client => ({
      id: client.id,
      connectedAt: client.connectedAt,
      lastActivity: client.lastActivity,
      model: client.model
    }))
  };
  res.json(stats);
});

// WebSocket endpoint for health check
app.get('/ws', (req, res) => {
  res.json({
    message: 'WebSocket endpoint available',
    connectedClients: connectedClients.size,
    endpoint: 'wss://your-domain.com/ws'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

server.listen(PORT, () => {
  console.log(`Render server running on port ${PORT}`);
  console.log(`Ollama server URL: ${OLLAMA_SERVER_URL}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
});
