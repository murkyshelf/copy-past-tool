#!/bin/bash

# Test script for AI Code Clipboard
echo "🧪 Testing AI Code Clipboard Components..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local url=$1
    local name=$2
    
    echo -n "Testing $name... "
    
    if curl -s --max-time 10 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        return 1
    fi
}

test_post_endpoint() {
    local url=$1
    local name=$2
    local data=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s --max-time 10 -X POST \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$url" 2>/dev/null)
    
    if echo "$response" | grep -q "success\|healthy\|working"; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo -e "${YELLOW}Response: $response${NC}"
        return 1
    fi
}

echo "🔍 Testing local components..."

# Test Ollama service
test_endpoint "http://localhost:11434/api/tags" "Ollama Service"

# Test custom Ollama server
test_endpoint "http://localhost:11435/health" "Custom Ollama Server"

# Test custom Ollama server functionality
test_post_endpoint "http://localhost:11435/test" "Custom Ollama Server API" '{"test": "data"}'

echo ""
echo "🌐 Testing server functionality..."

# Test code generation if servers are running
if curl -s --max-time 5 "http://localhost:11435/health" > /dev/null 2>&1; then
    echo "Testing code generation..."
    response=$(curl -s --max-time 30 -X POST \
        -H "Content-Type: application/json" \
        -d '{"content": "function add(a, b) { return a + b; }", "model": "qwen-coder"}' \
        "http://localhost:11435/generate" 2>/dev/null)
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ Code generation working${NC}"
    else
        echo -e "${YELLOW}⚠️  Code generation may have issues${NC}"
        echo "Response: $response"
    fi
fi

echo ""
echo "🔌 Testing WebSocket endpoints..."

# Test WebSocket endpoints (basic connectivity)
test_endpoint "http://localhost:3000/ws" "Render Server WebSocket Info"
test_endpoint "http://localhost:11435/ws" "Ollama Server WebSocket Info"

# Check if wscat is available for WebSocket testing
if command_exists wscat; then
    echo "Testing WebSocket connections with wscat..."
    
    # Test render server WebSocket (if running)
    if curl -s --max-time 5 "http://localhost:3000/health" > /dev/null 2>&1; then
        echo "WebSocket test available: wscat -c ws://localhost:3000/ws"
    fi
    
    # Test ollama server WebSocket (if running)
    if curl -s --max-time 5 "http://localhost:11435/health" > /dev/null 2>&1; then
        echo "WebSocket test available: wscat -c ws://localhost:11435/ws"
    fi
else
    echo -e "${YELLOW}ℹ️  Install wscat for WebSocket testing: npm install -g wscat${NC}"
fi

echo ""
echo "📋 Next steps:"
echo "1. If Ollama Service failed: Run 'ollama serve'"
echo "2. If Custom Ollama Server failed: Run 'cd ollama-server && npm start'"
echo "3. Deploy the render-server to Render.com"
echo "4. Load the Chrome extension"
echo "5. Configure the extension with your Render server URL"

echo ""
echo "🔧 Manual tests:"
echo "- Copy some text and check if it appears in the extension popup"
echo "- Try pasting in a text field to see if AI code is generated"
echo "- Use Ctrl+Shift+V to paste original content"
echo "- Open websocket-test.html in browser for WebSocket testing"
echo "- Check WebSocket status in extension popup"
