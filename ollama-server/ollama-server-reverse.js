const express = require('express');
const cors = require('cors');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { exec } = require('child_process');
const { promisify } = require('util');
const WebSocket = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const execAsync = promisify(exec);
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 11435;

// Configuration for connecting to Render server (reverse connection)
const RENDER_SERVER_URL = process.env.RENDER_SERVER_URL || 'wss://your-app.onrender.com';
const RENDER_WS_ENDPOINT = RENDER_SERVER_URL.endsWith('/ollama') ? RENDER_SERVER_URL : `${RENDER_SERVER_URL}/ollama`;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'qwen3:latest';
const SERVER_ID = process.env.SERVER_ID || uuidv4();

// WebSocket connection to Render server (outgoing connection)
let renderConnection = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
let isShuttingDown = false;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many requests, please try again later.'
});
app.use(limiter);

// Available models configuration
const AVAILABLE_MODELS = {
  'qwen-coder': 'qwen3:latest',
  'codellama': 'llama3.1:8b',
  'deepseek-coder': 'llama3.1:8b',
  'codegemma': 'llama3.1:8b'
};

// Connect to Render server via WebSocket (reverse connection)
function connectToRenderServer() {
  if (isShuttingDown) return;
  
  const wsUrl = RENDER_WS_ENDPOINT;
  console.log(`Attempting to connect to Render server: ${wsUrl}`);
  
  try {
    renderConnection = new WebSocket(wsUrl);
    
    renderConnection.on('open', () => {
      console.log('✅ Connected to Render server successfully!');
      reconnectAttempts = 0;
      
      // Register this Ollama server
      renderConnection.send(JSON.stringify({
        type: 'ollama_server_register',
        serverId: SERVER_ID,
        availableModels: Object.keys(AVAILABLE_MODELS),
        defaultModel: DEFAULT_MODEL,
        timestamp: Date.now()
      }));
    });
    
    renderConnection.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        await handleRenderMessage(message);
      } catch (error) {
        console.error('Error handling Render message:', error);
      }
    });
    
    renderConnection.on('close', (code, reason) => {
      console.log(`Connection to Render server closed: ${code} ${reason}`);
      renderConnection = null;
      
      if (!isShuttingDown && reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
        setTimeout(connectToRenderServer, delay);
      }
    });
    
    renderConnection.on('error', (error) => {
      console.error('Render server connection error:', error.message);
    });
    
  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
  }
}

// Handle messages from Render server
async function handleRenderMessage(message) {
  switch (message.type) {
    case 'ping':
      if (renderConnection && renderConnection.readyState === WebSocket.OPEN) {
        renderConnection.send(JSON.stringify({
          type: 'pong',
          serverId: SERVER_ID,
          timestamp: Date.now()
        }));
      }
      break;
      
    case 'generate_code_request':
      await handleCodeGenerationRequest(message);
      break;
      
    case 'model_change_request':
      // Handle model switching if needed
      console.log('Model change requested:', message.model);
      break;
      
    case 'ollama_connection_established':
      console.log('✅ Ollama connection established with Render server');
      break;
      
    case 'registration_confirmed':
      console.log('✅ Registration confirmed by Render server');
      break;
      
    default:
      console.log('Unknown message type from Render server:', message.type);
  }
}

// Handle code generation requests from Render server
async function handleCodeGenerationRequest(message) {
  const { requestId, content, model, options } = message;
  
  try {
    console.log(`Processing code generation request ${requestId}`);
    
    // Send processing status
    sendToRender({
      type: 'generation_status',
      requestId: requestId,
      status: 'processing',
      timestamp: Date.now()
    });
    
    const ollamaModel = AVAILABLE_MODELS[model] || DEFAULT_MODEL;
    await ensureModelAvailable(ollamaModel);
    
    const prompt = createCodePrompt(content);
    const generatedCode = await generateWithOllama(ollamaModel, prompt, options || {});
    
    // Send successful result
    sendToRender({
      type: 'generation_complete',
      requestId: requestId,
      success: true,
      code: generatedCode,
      model: model,
      ollamaModel: ollamaModel,
      originalContent: content.substring(0, 100) + '...',
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Code generation error:', error);
    
    // Send error result
    sendToRender({
      type: 'generation_error',
      requestId: requestId,
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
}

// Send message to Render server
function sendToRender(message) {
  if (renderConnection && renderConnection.readyState === WebSocket.OPEN) {
    renderConnection.send(JSON.stringify(message));
  } else {
    console.error('Cannot send to Render server - not connected');
  }
}

// Health check
app.get('/health', async (req, res) => {
  try {
    // Check if Ollama is running
    const response = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
    res.json({
      status: 'healthy',
      ollama: 'connected',
      renderConnection: renderConnection ? 'connected' : 'disconnected',
      availableModels: Object.keys(AVAILABLE_MODELS),
      installedModels: response.data.models?.map(m => m.name) || [],
      serverId: SERVER_ID,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      ollama: 'disconnected',
      renderConnection: renderConnection ? 'connected' : 'disconnected',
      error: error.message,
      serverId: SERVER_ID,
      timestamp: new Date().toISOString()
    });
  }
});

// Local HTTP endpoint for direct testing
app.post('/generate', async (req, res) => {
  try {
    const { 
      content, 
      model = 'qwen-coder', 
      temperature = 0.3,
      maxTokens = 2000 
    } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    const ollamaModel = AVAILABLE_MODELS[model] || DEFAULT_MODEL;
    console.log(`Generating code with model: ${ollamaModel}`);

    await ensureModelAvailable(ollamaModel);

    const prompt = createCodePrompt(content);
    const generatedCode = await generateWithOllama(ollamaModel, prompt, {
      temperature,
      max_tokens: maxTokens
    });

    res.json({
      success: true,
      code: generatedCode,
      model: model,
      ollamaModel: ollamaModel,
      originalContent: content.substring(0, 100) + '...',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Code generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Code generation failed',
      message: error.message
    });
  }
});

// Ensure model is available
async function ensureModelAvailable(modelName) {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`);
    const installedModels = response.data.models?.map(m => m.name) || [];
    
    if (!installedModels.includes(modelName)) {
      console.log(`Model ${modelName} not found, attempting to pull...`);
      await pullModel(modelName);
    }
  } catch (error) {
    console.error(`Error checking model availability: ${error.message}`);
  }
}

// Pull model if not available
async function pullModel(modelName) {
  try {
    console.log(`Pulling model: ${modelName}`);
    const { stdout, stderr } = await execAsync(`ollama pull ${modelName}`);
    console.log(`Model pull output: ${stdout}`);
    if (stderr) console.error(`Model pull stderr: ${stderr}`);
  } catch (error) {
    console.error(`Failed to pull model ${modelName}: ${error.message}`);
    throw error;
  }
}

// Generate code using Ollama
async function generateWithOllama(model, prompt, options = {}) {
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: options.temperature || 0.3,
        top_p: 0.9,
        num_predict: options.max_tokens || 2000,
        stop: ['```', 'Human:', 'User:']
      }
    }, {
      timeout: 60000
    });

    if (response.data && response.data.response) {
      return cleanGeneratedCode(response.data.response);
    } else {
      throw new Error('No response from Ollama');
    }
  } catch (error) {
    console.error('Ollama generation error:', error.message);
    throw error;
  }
}

// Create optimized prompt for code generation
function createCodePrompt(content) {
  const contentType = analyzeContent(content);
  
  const basePrompt = `You are an expert programmer. Your task is to analyze the provided content and generate clean, functional code.

Rules:
- Only return code, no explanations or markdown
- Ensure the code is syntactically correct
- Follow best practices for the detected language
- If fixing errors, provide the corrected version
- If enhancing code, improve efficiency and readability`;

  switch (contentType.type) {
    case 'error':
      return `${basePrompt}

The user has copied an error message or problematic code. Please provide the corrected version:

${content}

Fixed code:`;

    case 'code':
      return `${basePrompt}

The user has copied some code. Please optimize and improve it:

${content}

Improved code:`;

    case 'description':
      return `${basePrompt}

The user has copied a description or requirement. Please implement it as code:

${content}

Implementation:`;

    default:
      return `${basePrompt}

Content: ${content}

Generated code:`;
  }
}

// Analyze content type
function analyzeContent(content) {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('error') || 
      lowerContent.includes('exception') || 
      lowerContent.includes('failed') ||
      lowerContent.includes('traceback')) {
    return { type: 'error', confidence: 0.8 };
  }
  
  const codePatterns = [
    /function\s+\w+/i,
    /class\s+\w+/i,
    /def\s+\w+/i,
    /const\s+\w+\s*=/i,
    /let\s+\w+\s*=/i,
    /var\s+\w+\s*=/i,
    /import\s+.*from/i,
    /\{[\s\S]*\}/,
    /\[[\s\S]*\]/,
    /.*\(\s*\)\s*{/,
    /.*;$/m
  ];
  
  const codeMatches = codePatterns.filter(pattern => pattern.test(content)).length;
  if (codeMatches >= 2) {
    return { type: 'code', confidence: 0.9 };
  }
  
  return { type: 'description', confidence: 0.6 };
}

// Clean generated code
function cleanGeneratedCode(code) {
  code = code.replace(/^(Here's|Here is|The code is|The implementation is).*?:\s*/i, '');
  code = code.replace(/```[\w]*\n?/g, '');
  code = code.replace(/^```|```$/g, '');
  code = code.replace(/^\s*\/\*[\s\S]*?\*\/\s*/g, '');
  code = code.replace(/^\s*\/\/.*$/gm, '');
  
  code = code.trim();
  return code;
}

// List available models
app.get('/models', async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`);
    const installedModels = response.data.models || [];
    
    res.json({
      availableModels: AVAILABLE_MODELS,
      installedModels: installedModels.map(m => ({
        name: m.name,
        size: m.size,
        modified: m.modified_at
      })),
      defaultModel: DEFAULT_MODEL,
      renderConnection: renderConnection ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch models',
      message: error.message
    });
  }
});

// Test endpoint
app.post('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Ollama server is working',
    renderConnection: renderConnection ? 'connected' : 'disconnected',
    serverId: SERVER_ID,
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    serverId: SERVER_ID,
    renderConnection: renderConnection ? 'connected' : 'disconnected',
    renderUrl: RENDER_SERVER_URL,
    reconnectAttempts: reconnectAttempts,
    availableModels: Object.keys(AVAILABLE_MODELS),
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  isShuttingDown = true;
  
  if (renderConnection) {
    renderConnection.send(JSON.stringify({
      type: 'ollama_server_disconnect',
      serverId: SERVER_ID,
      timestamp: Date.now()
    }));
    renderConnection.close();
  }
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server and connect to Render
server.listen(PORT, () => {
  console.log(`🚀 Ollama AI server running on port ${PORT}`);
  console.log(`🔌 Connecting to Ollama at: ${OLLAMA_URL}`);
  console.log(`🌐 Render server: ${RENDER_SERVER_URL}`);
  console.log(`🆔 Server ID: ${SERVER_ID}`);
  console.log(`📊 Available models: ${Object.keys(AVAILABLE_MODELS).join(', ')}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log('');
  
  // Connect to Render server
  setTimeout(connectToRenderServer, 2000); // Give server a moment to start
});
