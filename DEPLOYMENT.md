# Deployment Guide

This guide will help you deploy the geofencing system to get live URLs for both frontend and backend.

## Backend Deployment Options

### Option 1: Railway (Recommended - Easiest)

1. **Sign up at [Railway](https://railway.app)**

2. **Deploy from GitHub:**
   ```bash
   # Push your code to GitHub first
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

3. **In Railway Dashboard:**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Set the **Root Directory**: `backend`
   - Railway will auto-detect the Dockerfile

4. **Add Environment Variables:**
   - Click on your service → Variables
   - Add:
     ```
     PORT=8080
     ```
   - Railway will automatically provide PostgreSQL addon

5. **Add PostgreSQL:**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically set DB environment variables

6. **Get your backend URL:**
   - Railway will provide a URL like: `https://your-app.railway.app`

### Option 2: Render

1. **Sign up at [Render](https://render.com)**

2. **Create PostgreSQL Database:**
   - New → PostgreSQL
   - Save the **Internal Database URL**

3. **Create Web Service:**
   - New → Web Service
   - Connect your GitHub repository
   - Settings:
     - **Root Directory**: `backend`
     - **Environment**: Docker
     - **Docker Build Context Directory**: `backend`

4. **Environment Variables:**
   ```
   DB_HOST=<from postgresql internal url>
   DB_PORT=5432
   DB_USER=<from postgresql>
   DB_PASSWORD=<from postgresql>
   DB_NAME=<from postgresql>
   PORT=8080
   ```

5. **Get your backend URL:**
   - Render provides: `https://your-app.onrender.com`

### Option 3: Fly.io

1. **Install Fly CLI:**
   ```bash
   brew install flyctl
   # or
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login:**
   ```bash
   flyctl auth login
   ```

3. **Create fly.toml in backend directory:**
   See `backend/fly.toml` (created below)

4. **Deploy:**
   ```bash
   cd backend
   flyctl launch
   flyctl deploy
   ```

---

## Frontend Deployment Options

### Option 1: Vercel (Recommended - Easiest)

1. **Sign up at [Vercel](https://vercel.com)**

2. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

3. **Deploy:**
   ```bash
   cd frontend
   vercel
   ```

4. **Set Environment Variables:**
   - In Vercel Dashboard → Settings → Environment Variables:
     ```
     REACT_APP_API_URL=https://your-backend-url.railway.app
     REACT_APP_WS_URL=wss://your-backend-url.railway.app/ws/alerts
     ```

5. **Redeploy:**
   ```bash
   vercel --prod
   ```

6. **Get your frontend URL:**
   - Vercel provides: `https://your-app.vercel.app`

### Option 2: Netlify

1. **Sign up at [Netlify](https://netlify.com)**

2. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

3. **Build the frontend:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

4. **Deploy:**
   ```bash
   netlify deploy --prod --dir=build
   ```

5. **Set Environment Variables:**
   - In Netlify Dashboard → Site settings → Environment variables:
     ```
     REACT_APP_API_URL=https://your-backend-url.railway.app
     REACT_APP_WS_URL=wss://your-backend-url.railway.app/ws/alerts
     ```

6. **Rebuild:**
   ```bash
   npm run build
   netlify deploy --prod --dir=build
   ```

### Option 3: Cloudflare Pages

1. **Sign up at [Cloudflare Pages](https://pages.cloudflare.com)**

2. **Connect GitHub repository:**
   - Build command: `npm run build`
   - Build output directory: `build`
   - Root directory: `frontend`

3. **Environment Variables:**
   ```
   REACT_APP_API_URL=https://your-backend-url.railway.app
   REACT_APP_WS_URL=wss://your-backend-url.railway.app/ws/alerts
   ```

---

## Quick Deploy Script

I've created a deployment helper script for you. See `deploy.sh` below.

---

## Recommended Deployment Path

**For fastest deployment:**

1. **Backend → Railway**
   - Free tier available
   - Auto PostgreSQL
   - Easy setup
   - Get URL: `https://geofencing-backend.railway.app`

2. **Frontend → Vercel**
   - Free tier available
   - Fast deployment
   - Automatic HTTPS
   - Get URL: `https://geofencing-app.vercel.app`

---

## Step-by-Step Quick Deploy

### Step 1: Prepare Code
```bash
# Make sure everything is committed
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Deploy Backend to Railway

```bash
# No CLI needed - use web interface
# 1. Go to railway.app
# 2. New Project → Deploy from GitHub
# 3. Select repository
# 4. Set root directory: backend
# 5. Add PostgreSQL database
# 6. Copy the backend URL
```

### Step 3: Deploy Frontend to Vercel

```bash
cd frontend

# Update .env with backend URL
echo "REACT_APP_API_URL=https://YOUR-BACKEND-URL" > .env
echo "REACT_APP_WS_URL=wss://YOUR-BACKEND-URL/ws/alerts" >> .env

# Deploy
npm install -g vercel
vercel login
vercel

# Set environment variables in Vercel dashboard
# Then deploy to production
vercel --prod
```

### Step 4: Test Your Deployment

```bash
# Test backend
curl https://your-backend-url/geofences

# Test frontend
# Open in browser: https://your-frontend-url
```

---

## Important Notes

### CORS Configuration
Your backend already has CORS enabled for all origins (`*`). For production, update `backend/main.go`:

```go
corsHandler := cors.New(cors.Options{
    AllowedOrigins:   []string{"https://your-frontend-url.vercel.app"},
    AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowedHeaders:   []string{"*"},
    AllowCredentials: true,
})
```

### WebSocket URLs
- HTTP → `http://` becomes `https://`
- WS → `ws://` becomes `wss://`

### Database
- Railway: Automatically provisions PostgreSQL with PostGIS
- Render: Need to install PostGIS extension manually
- Fly.io: Need to provision separately

---

## Troubleshooting

### Backend won't start
- Check environment variables are set
- Verify PostgreSQL database is running
- Check logs in deployment platform

### Frontend can't connect to backend
- Verify CORS settings
- Check API URL environment variables
- Ensure using `https://` not `http://`

### WebSocket connection fails
- Use `wss://` protocol
- Check firewall/security settings
- Verify WebSocket endpoint is accessible

---

## Alternative: Single Command Deploy with Docker

If you prefer to deploy to a VPS or cloud VM:

```bash
# On your server
git clone https://github.com/your-username/mapup-project.git
cd mapup-project
docker-compose up -d

# Access via server IP
# Frontend: http://your-server-ip:3000
# Backend: http://your-server-ip:8080
```

For DigitalOcean, AWS EC2, or Google Cloud VM, you can use Docker Compose directly.
