#!/bin/bash
# Start LIBERTY Server (Frontend + Backend Integrados)

echo "🚀 Starting LIBERTY Server..."

# Kill existing processes
pkill -f liberty-server 2>/dev/null
sleep 2

# Build if needed
cargo build -p liberty-server 2>/dev/null

# Start integrated server
echo "🌐 Starting server on http://localhost:8443"
nohup ./target/debug/liberty-server > /tmp/server.log 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to start..."
for i in {1..30}; do
  if curl -s http://localhost:8443/health > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                ✅ LIBERTY SERVER READY                     ║"
echo "║                                                           ║"
echo "║   🌐 Access: http://localhost:8443                       ║"
echo "║                                                           ║"
echo "║   Features:                                               ║"
echo "║   • Frontend React/Vue integrado                          ║"
echo "║   • Backend API Rust                                      ║"
echo "║   • WebSocket real-time                                   ║"
echo "║   • SQLite database                                       ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Pressione Ctrl+C para parar o servidor"

# Wait for Ctrl+C
trap "echo ''; echo '🛑 Stopping server...'; kill $SERVER_PID 2>/dev/null; exit" INT
wait
