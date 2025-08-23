#!/bin/bash

# Debug script for checking if the React app is working
# Run this script to check various aspects of the app

echo "🔍 Debugging GPT for Kids Frontend"
echo "================================="

# Check Node version
echo "📦 Node.js version:"
node --version
echo ""

# Check if development server is running
echo "🌐 Checking if development server is running..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:5174 | grep -q 200
if [ $? -eq 0 ]; then
    echo "✅ Development server is running on http://localhost:5174"
else
    echo "❌ Development server is not running or not responding"
fi
echo ""

# Check if essential files exist
echo "📁 Checking essential files..."
files=(
    "src/App.jsx"
    "src/main.jsx"
    "src/index.css"
    "src/App.css"
    "package.json"
    "index.html"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing"
    fi
done
echo ""

# Check for syntax errors in main files
echo "🔧 Checking for syntax errors..."
node -c src/main.jsx 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ src/main.jsx syntax is valid"
else
    echo "❌ src/main.jsx has syntax errors"
fi

node -c src/App.jsx 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ src/App.jsx syntax is valid"
else
    echo "❌ src/App.jsx has syntax errors"
fi
echo ""

echo "🎯 Debug complete!"
echo "If you see a blank page, check the browser console for errors."
echo "Open http://localhost:5174 in your browser and press F12 to see console."
