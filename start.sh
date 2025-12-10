#!/bin/bash

# Geofencing System - Quick Start Script
# This script helps you get started with the geofencing system

echo "🚀 Geofencing & Vehicle Tracking System"
echo "========================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check if .env files exist, if not create from examples
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend/.env from example..."
    cp backend/.env.example backend/.env
fi

if [ ! -f frontend/.env ]; then
    echo "📝 Creating frontend/.env from example..."
    cp frontend/.env.example frontend/.env
fi

echo ""
echo "🐳 Starting all services with Docker Compose..."
echo ""

docker-compose up --build

# Note: The script will run docker-compose in foreground
# Press Ctrl+C to stop all services
