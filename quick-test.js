#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🧪 Testing the Chrome Extension + Render + Ollama system...\n');

// Test 1: Health check
console.log('1. Testing health endpoint...');
fetch('http://localhost:3000/health')
  .then(response => response.json())
  .then(data => {
    console.log('✅ Health check passed:', data);
    
    // Test 2: WebSocket connection and code request
    console.log('\n2. Testing WebSocket connection and code generation...');
    
    const ws = new WebSocket('ws://localhost:3000/ws');
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      
      // Send a test code request (simulating Chrome extension)
      const testRequest = {
        type: 'process_clipboard',
        content: 'Create a function that adds two numbers',
        requestId: 'test-' + Date.now()
      };
      
      console.log('📤 Sending test request:', testRequest);
      ws.send(JSON.stringify(testRequest));
    });
    
    ws.on('message', (data) => {
      try {
        const response = JSON.parse(data.toString());
        console.log('📥 Received response:', response);
        
        if (response.type === 'ai_code_generated') {
          console.log('✅ Code generation successful!');
          console.log('Generated code:');
          console.log('```');
          console.log(response.aiCode);
          console.log('```');
          ws.close();
          process.exit(0);
        } else if (response.type === 'error') {
          console.log('❌ Error received:', response.message);
          ws.close();
          process.exit(1);
        }
      } catch (e) {
        console.log('❌ Failed to parse response:', e.message);
        ws.close();
        process.exit(1);
      }
    });
    
    ws.on('error', (error) => {
      console.log('❌ WebSocket error:', error.message);
      process.exit(1);
    });
    
    ws.on('close', () => {
      console.log('🔌 WebSocket connection closed');
    });
    
    // Timeout after 60 seconds
    setTimeout(() => {
      console.log('❌ Test timeout - closing connection');
      ws.close();
      process.exit(1);
    }, 60000);
    
  })
  .catch(error => {
    console.log('❌ Health check failed:', error.message);
    process.exit(1);
  });
