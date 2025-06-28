#!/usr/bin/env bash

# Microsoft Power Platform Admin Concierge - Setup Script
# This script installs all dependencies and sets up the development environment

set -e

echo "🚀 Setting up Microsoft Power Platform Admin Concierge..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Create environment files if they don't exist
echo "📄 Setting up environment files..."

if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env from example"
else
    echo "⚠️  backend/.env already exists"
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create data directory for SQLite database
echo "📁 Creating data directory..."
mkdir -p backend/data
mkdir -p backend/logs

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the development servers:"
echo "  npm run dev"
echo ""
echo "Individual commands:"
echo "  Backend: npm run server:dev"
echo "  Frontend: npm run client:dev"
echo ""
echo "🌐 Application URLs:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:5000"
echo ""
echo "📚 Documentation:"
echo "  - Check README.md for detailed information"
echo "  - Review compliance checklist in the app"
echo "  - Explore Power Platform CLI commands"
echo ""
