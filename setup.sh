#!/bin/bash

# AI Code Clipboard Setup Script
echo "🚀 Setting up AI Code Clipboard..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js
if command_exists node; then
    echo "✅ Node.js is installed ($(node --version))"
else
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check npm
if command_exists npm; then
    echo "✅ npm is installed ($(npm --version))"
else
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Setup Ollama Server
echo "📦 Setting up Ollama Server..."
cd ollama-server
npm install
echo "✅ Ollama server dependencies installed"

# Check if Ollama is installed
if command_exists ollama; then
    echo "✅ Ollama is already installed"
    echo "🔧 Running setup..."
    npm run setup
else
    echo "⚠️  Ollama is not installed. Please install it:"
    echo "Linux/macOS: curl -fsSL https://ollama.ai/install.sh | sh"
    echo "Or visit: https://ollama.ai/download"
    echo ""
    echo "After installing Ollama, run: npm run setup"
fi

cd ..

# Setup Render Server
echo "📦 Setting up Render Server..."
cd render-server
npm install
echo "✅ Render server dependencies installed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created .env file from example. Please update it with your settings."
fi

cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start Ollama service: ollama serve"
echo "2. Start Ollama server: cd ollama-server && npm start"
echo "3. Deploy render-server to Render.com"
echo "4. Load chrome-extension in Chrome (chrome://extensions/)"
echo "5. Configure extension with your Render server URL"
echo ""
echo "For detailed instructions, see README.md"
