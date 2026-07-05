# Deployment Guide - Precedent

Complete guide to deploy Precedent to production using Railway (backend) and Vercel (frontend).

## Prerequisites

1. GitHub repository with the code pushed
2. Cognee Cloud API Token
3. OpenAI API Key (optional, for future LLM features)
4. Railway account (https://railway.app)
5. Vercel account (https://vercel.com)

## Architecture

```
┌─────────────────────────────────────────────┐
│        Vercel (Frontend - Next.js)          │
│     https://precedent.vercel.app            │
└────────────────────┬────────────────────────┘
                     │ API Calls
┌────────────────────▼────────────────────────┐
│      Railway (Backend - FastAPI)            │
│  https://precedent-api.railway.app          │
└────────────────────┬────────────────────────┘
                     │ HTTP
┌────────────────────▼────────────────────────┐
│      Cognee Cloud (Knowledge Graph)         │
│     https://api.cognee.cloud                │
└─────────────────────────────────────────────┘
```

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Project

1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Connect your GitHub repository
5. Select the branch to deploy (usually `main`)

### 1.2 Configure Backend Service

1. Railway will detect the Dockerfile in `/backend`
2. Click on the service to open settings
3. Go to "Variables" tab
4. Add environment variables:
   - `COGNEE_API_TOKEN`: Your Cognee Cloud API token
   - `OPENAI_API_KEY`: Your OpenAI API key (optional)
   - `PORT`: 8000 (should be auto-set)

### 1.3 Configure Build Settings

1. Go to "Settings" tab
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Dockerfile: `backend/Dockerfile`

### 1.4 Deploy

1. Click "Deploy"
2. Watch the deployment logs in the "Deployments" tab
3. Once deployed, note the URL: `https://your-project-name.railway.app`

### 1.5 Test Backend

```bash
# Health check
curl https://your-project-name.railway.app/api/health

# Should return:
# {"status":"healthy","cognee_connected":true,"timestamp":"2024-07-04T..."}
```

## Step 2: Deploy Frontend to Vercel

### 2.1 Import Project to Vercel

1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. "Import Git Repository"
4. Select your repository
5. Click "Import"

### 2.2 Configure Environment Variables

In the "Environment Variables" section, add:

```
NEXT_PUBLIC_API_URL = https://your-railway-backend.railway.app
```

**Important**: Must start with `NEXT_PUBLIC_` to be available in the browser.

### 2.3 Build Settings

Vercel will auto-detect Next.js. Confirm:
- **Framework Preset**: Next.js
- **Build Command**: `pnpm run build` (or auto-detected)
- **Output Directory**: `.next`

### 2.4 Deploy

1. Click "Deploy"
2. Vercel will build and deploy automatically
3. Once complete, you'll get a URL: `https://your-project.vercel.app`

### 2.5 Test Frontend

Visit `https://your-project.vercel.app` and verify:
- UI loads correctly
- Sidebar displays with Memory Health widget
- Chat interface is interactive

## Step 3: Connect Frontend to Backend

### 3.1 Update Frontend Environment

If you haven't already set `NEXT_PUBLIC_API_URL` in Vercel:

1. Go to Vercel project settings
2. "Environment Variables"
3. Add: `NEXT_PUBLIC_API_URL=https://your-railway-backend.railway.app`
4. Trigger a redeploy: Go to "Deployments" → "Redeploy" on the latest deployment

### 3.2 Test Connection

In the Vercel deployment:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try the chat feature
4. Check for errors in the console
5. Verify Network tab shows requests to the Railway backend

## Step 4: Monitor and Maintain

### View Logs

**Railway Backend Logs**:
1. Go to your Railway project
2. Select the service
3. "Logs" tab
4. Watch real-time logs or search past logs

**Vercel Frontend Logs**:
1. Go to your Vercel project
2. "Deployments" tab
3. Click on a deployment
4. "Logs" section

### Check Health

```bash
# Backend health
curl https://your-railway-backend.railway.app/api/health

# Frontend - visit and check DevTools Console for errors
```

### Monitor Cognee Connection

The backend logs will show:
```
[v0] Precedent Backend Initialized
[v0] Cognee Cloud Connected: True
```

If `False`, check:
1. `COGNEE_API_TOKEN` is set correctly in Railway
2. Token hasn't expired in Cognee dashboard
3. Network connectivity

## Troubleshooting

### Backend won't deploy

**Error**: "ModuleNotFoundError: No module named 'fastapi'"

Solution:
1. Ensure `backend/requirements.txt` has all dependencies
2. Check Railway uses correct `Dockerfile`
3. Rebuild: go to Deployments, trigger rebuild

**Error**: "AttributeError: module 'httpx' has no attribute..."

Solution:
1. Check Python version compatibility
2. Rebuild from clean environment
3. Verify requirements.txt versions

### Frontend shows API errors

**Error**: "Failed to fetch from /api/chat"

Causes:
1. Backend not deployed yet - wait for Railway deployment
2. Wrong `NEXT_PUBLIC_API_URL` - should be full Railway URL
3. CORS issue - backend should have CORS enabled (it does in our code)
4. Network firewall - check if Railway allows external requests

Solution:
1. Check `NEXT_PUBLIC_API_URL` in Vercel Settings
2. Test backend directly: `curl https://your-backend.railway.app/api/health`
3. Redeploy frontend after fixing env vars

### Cognee Cloud not working

**Error**: "Cognee not configured"

Solution:
1. Set `COGNEE_API_TOKEN` in Railway environment variables
2. Verify token format (usually starts with specific prefix)
3. Test token manually via curl:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.cognee.cloud/health
   ```

### High latency or timeouts

**Cause**: Cognee API calls taking too long

Solution:
1. Check Cognee Cloud status page
2. Try again - might be temporary
3. Optimize extraction logic to make fewer calls

## Continuous Deployment

### Auto-deploy on Git Push

Both Railway and Vercel auto-deploy on push to `main`:

1. **Railway**: Watches GitHub branch
   - Push code → Railway rebuilds/redeploys

2. **Vercel**: Watches GitHub branch
   - Push code → Vercel rebuilds/redeploys
   - Automatic preview deployments on PR

### Update Secrets Securely

Never commit `.env` or secrets:

1. **Update in Railway**:
   - Go to Variables
   - Change environment variable
   - Auto-redeploys (if configured)

2. **Update in Vercel**:
   - Go to Environment Variables
   - Change variable
   - Manually trigger redeploy in Deployments

## Rollback

### Rollback to Previous Version

**Railway**:
1. Go to Deployments
2. Find previous working deployment
3. Click the three dots → "Redeploy"
4. Confirms the previous version

**Vercel**:
1. Go to Deployments
2. Find previous stable version
3. Click "Promote to Production"

## Domain Setup (Optional)

### Add Custom Domain

**Vercel Frontend**:
1. Settings → Domains
2. Add your domain (e.g., precedent.com)
3. Follow DNS instructions

**Railway Backend** (if using custom domain):
1. Settings → Domains
2. Add your domain (e.g., api.precedent.com)
3. Configure DNS

## Scaling

### As Traffic Grows

**Vercel**: Auto-scales automatically (no action needed)

**Railway**: 
1. Monitor resource usage in Dashboard
2. Go to Service Settings → Plan
3. Upgrade compute as needed
4. Consider dedicated database if adding

## Security Checklist

- [ ] `COGNEE_API_TOKEN` is secret (Railway Variables)
- [ ] `OPENAI_API_KEY` is secret (Railway Variables)
- [ ] CORS allows only your domain (or `*` for development)
- [ ] No credentials in code/git history
- [ ] HTTPS enforced (auto on both platforms)
- [ ] Rate limiting implemented (if needed)
- [ ] Secrets aren't logged (check logs don't leak tokens)

## Cost Estimation

**Railway**:
- Free tier: 5GB storage, limited compute
- Pro tier: Pay-as-you-go (~$5/month for light usage)

**Vercel**:
- Free tier: 100GB bandwidth/month
- Pro tier: $20/month + overage

**Cognee Cloud**:
- Check their pricing page for API call rates

## Support & Resources

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Cognee Docs: Check your Cognee Cloud dashboard
- FastAPI Docs: https://fastapi.tiangolo.com
- Next.js Docs: https://nextjs.org/docs

---

**Deployment Complete!** 🚀

Once deployed, your app will be available at `https://your-project.vercel.app` with the backend at `https://your-backend.railway.app`.
