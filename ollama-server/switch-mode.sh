#!/bin/bash

# Ollama Server Mode Switcher
echo "🔄 Ollama Server Mode Switcher"
echo ""

cd "$(dirname "$0")"

if [ ! -f "ollama-server.js" ] || [ ! -f "ollama-server-reverse.js" ]; then
    echo "❌ Missing server files!"
    exit 1
fi

echo "Current mode:"
if grep -q "RENDER_SERVER_URL" ollama-server.js; then
    echo "📡 Reverse Connection Mode (No port forwarding needed)"
    current_mode="reverse"
else
    echo "🔌 Direct Connection Mode (Requires port forwarding)"
    current_mode="direct"
fi

echo ""
echo "Available modes:"
echo "1) Reverse Connection (No port forwarding) - RECOMMENDED"
echo "2) Direct Connection (Requires port forwarding/ngrok)"
echo "3) Show current configuration"
echo "4) Exit"
echo ""

read -p "Select mode (1-4): " choice

case $choice in
    1)
        echo "🔄 Switching to Reverse Connection Mode..."
        cp ollama-server-reverse.js ollama-server.js
        echo "✅ Switched to Reverse Connection Mode"
        echo ""
        echo "📝 To start the server:"
        echo "   RENDER_SERVER_URL=wss://your-app.onrender.com npm start"
        echo ""
        echo "🔥 Benefits:"
        echo "   - No port forwarding needed"
        echo "   - No router configuration"
        echo "   - Works behind corporate firewalls"
        echo "   - More secure (outbound connections only)"
        ;;
    2)
        echo "⚠️  Switching to Direct Connection Mode..."
        echo "    This mode requires port forwarding or ngrok"
        read -p "Are you sure? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            # Restore original file (would need to be saved)
            echo "❌ Direct mode not implemented yet"
            echo "   Use reverse mode for now (option 1)"
        else
            echo "❌ Cancelled"
        fi
        ;;
    3)
        echo "📊 Current Configuration:"
        echo ""
        if [ "$current_mode" = "reverse" ]; then
            echo "Mode: Reverse Connection"
            echo "Description: Ollama server connects TO Render server"
            echo "Port forwarding: Not needed"
            echo "Firewall: Outbound connections only"
            echo ""
            echo "Environment variables:"
            echo "  RENDER_SERVER_URL=wss://your-app.onrender.com"
            echo ""
            echo "Start command:"
            echo "  npm start"
        else
            echo "Mode: Direct Connection"
            echo "Description: Render server connects TO Ollama server"
            echo "Port forwarding: Required"
            echo "Firewall: Incoming connections needed"
        fi
        ;;
    4)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac
