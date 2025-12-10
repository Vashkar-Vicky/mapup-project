#!/bin/bash

# Geofencing System - Deployment Helper Script
# This script helps you deploy to various platforms

set -e

echo "🚀 Geofencing System Deployment Helper"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if git is initialized
if [ ! -d .git ]; then
    print_error "Git repository not initialized"
    echo "Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit"
    print_success "Git initialized"
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    print_warning "You have uncommitted changes"
    read -p "Do you want to commit them now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        read -p "Commit message: " commit_msg
        git commit -m "$commit_msg"
        print_success "Changes committed"
    fi
fi

echo ""
echo "Choose deployment option:"
echo "1. Deploy Backend to Railway"
echo "2. Deploy Frontend to Vercel"
echo "3. Deploy Both (Railway + Vercel)"
echo "4. Deploy to Render (Backend + Frontend)"
echo "5. Generate Fly.io config"
echo "6. Exit"
echo ""
read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo ""
        echo "📦 Backend Deployment to Railway"
        echo "================================"
        echo ""
        echo "Follow these steps:"
        echo "1. Push your code to GitHub:"
        echo "   ${YELLOW}git push origin main${NC}"
        echo ""
        echo "2. Go to https://railway.app"
        echo "3. Click 'New Project' → 'Deploy from GitHub repo'"
        echo "4. Select this repository"
        echo "5. Set Root Directory: ${YELLOW}backend${NC}"
        echo "6. Add PostgreSQL database:"
        echo "   - Click 'New' → 'Database' → 'PostgreSQL'"
        echo "7. Your backend will be available at:"
        echo "   ${GREEN}https://your-app.railway.app${NC}"
        echo ""
        read -p "Press Enter when you have the backend URL..."
        read -p "Enter your Railway backend URL: " backend_url
        echo "BACKEND_URL=$backend_url" > .env.deployment
        print_success "Backend URL saved!"
        ;;
        
    2)
        echo ""
        echo "🎨 Frontend Deployment to Vercel"
        echo "================================="
        echo ""
        
        # Check if Vercel CLI is installed
        if ! command -v vercel &> /dev/null; then
            print_warning "Vercel CLI not found. Installing..."
            npm install -g vercel
        fi
        
        # Check for backend URL
        if [ -f .env.deployment ]; then
            source .env.deployment
            if [ -z "$BACKEND_URL" ]; then
                read -p "Enter your backend URL: " backend_url
                BACKEND_URL=$backend_url
            fi
        else
            read -p "Enter your backend URL: " backend_url
            BACKEND_URL=$backend_url
        fi
        
        # Update frontend .env
        cd frontend
        echo "REACT_APP_API_URL=$BACKEND_URL" > .env.production
        echo "REACT_APP_WS_URL=wss://${BACKEND_URL#https://}/ws/alerts" >> .env.production
        
        print_success "Environment variables configured"
        
        echo ""
        echo "Deploying to Vercel..."
        vercel --prod
        
        print_success "Frontend deployed!"
        echo ""
        echo "Don't forget to add environment variables in Vercel Dashboard:"
        echo "1. Go to your project settings"
        echo "2. Environment Variables section"
        echo "3. Add:"
        echo "   REACT_APP_API_URL=$BACKEND_URL"
        echo "   REACT_APP_WS_URL=wss://${BACKEND_URL#https://}/ws/alerts"
        ;;
        
    3)
        echo ""
        echo "🚀 Full Stack Deployment"
        echo "======================="
        echo ""
        print_warning "This will deploy both backend and frontend"
        echo ""
        echo "Step 1: Deploy Backend to Railway"
        echo "Follow the instructions for Railway deployment (option 1)"
        read -p "Press Enter when ready..."
        
        read -p "Enter your Railway backend URL: " backend_url
        echo "BACKEND_URL=$backend_url" > .env.deployment
        
        echo ""
        echo "Step 2: Deploy Frontend to Vercel"
        
        if ! command -v vercel &> /dev/null; then
            print_warning "Installing Vercel CLI..."
            npm install -g vercel
        fi
        
        cd frontend
        echo "REACT_APP_API_URL=$backend_url" > .env.production
        ws_url="wss://${backend_url#https://}/ws/alerts"
        echo "REACT_APP_WS_URL=$ws_url" >> .env.production
        
        echo ""
        echo "Deploying frontend..."
        vercel --prod
        
        print_success "Deployment complete!"
        ;;
        
    4)
        echo ""
        echo "📦 Render Deployment"
        echo "==================="
        echo ""
        echo "Backend Deployment:"
        echo "1. Go to https://render.com"
        echo "2. Create PostgreSQL Database"
        echo "3. Create Web Service from GitHub"
        echo "4. Settings:"
        echo "   - Root Directory: backend"
        echo "   - Environment: Docker"
        echo "5. Add environment variables from PostgreSQL"
        echo ""
        echo "Frontend Deployment:"
        echo "1. Create Static Site"
        echo "2. Build Command: npm run build"
        echo "3. Publish Directory: build"
        echo "4. Root Directory: frontend"
        echo "5. Add environment variables"
        ;;
        
    5)
        echo ""
        echo "✈️  Generating Fly.io Configuration"
        echo "==================================="
        echo ""
        
        # Generate fly.toml for backend
        cat > backend/fly.toml << 'EOF'
app = "geofencing-backend"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8080"

[[services]]
  http_checks = []
  internal_port = 8080
  processes = ["app"]
  protocol = "tcp"
  script_checks = []

  [services.concurrency]
    hard_limit = 25
    soft_limit = 20
    type = "connections"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.tcp_checks]]
    grace_period = "1s"
    interval = "15s"
    restart_limit = 0
    timeout = "2s"
EOF

        print_success "fly.toml created in backend/"
        echo ""
        echo "To deploy to Fly.io:"
        echo "1. Install Fly CLI:"
        echo "   ${YELLOW}brew install flyctl${NC}"
        echo "2. Login:"
        echo "   ${YELLOW}flyctl auth login${NC}"
        echo "3. Deploy backend:"
        echo "   ${YELLOW}cd backend && flyctl launch${NC}"
        echo "4. Create PostgreSQL:"
        echo "   ${YELLOW}flyctl postgres create${NC}"
        ;;
        
    6)
        echo "Goodbye!"
        exit 0
        ;;
        
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

echo ""
print_success "Deployment process complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Test your backend API endpoints"
echo "2. Test your frontend application"
echo "3. Configure GitHub collaborators"
echo "4. Submit your URLs"
