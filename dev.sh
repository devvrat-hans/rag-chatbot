#!/bin/bash

# Development server script for RAG Chatbot
# Starts both Supabase local development and frontend server

set -e

echo "🔧 Starting RAG Chatbot development environment..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "npm install -g @supabase/cli"
    exit 1
fi

# Start Supabase local development
echo "📊 Starting Supabase local development..."
supabase start

echo "✅ Supabase is running locally"
echo ""
echo "🌐 To start the frontend server, run one of these commands:"
echo ""
echo "Python 3:"
echo "cd src/pages && python -m http.server 3000"
echo ""
echo "Node.js (http-server):"
echo "npx http-server src/pages -p 3000"
echo ""
echo "PHP:"
echo "cd src/pages && php -S localhost:3000"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo ""
echo "📋 Supabase Local URLs:"
supabase status
