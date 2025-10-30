# GitHub OAuth Setup Guide

Complete guide to set up GitHub OAuth authentication for local development.

## Prerequisites

- GitHub account
- Node.js and npm installed
- Whisker Editor repository cloned

## Step 1: Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: `Whisker Editor (Dev)`
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:5173/auth/github/callback`
   - **Application description**: (optional) `Interactive fiction editor with GitHub integration`
4. Click "Register application"
5. You'll see your **Client ID** - keep this page open!
6. Click "Generate a new client secret"
7. Copy both the **Client ID** and **Client Secret** immediately

## Step 2: Configure Environment Variables

The `.env.local` file has already been created with your Client ID. Now add your Client Secret:

```bash
# Add this line to .env.local
GITHUB_CLIENT_SECRET=your_client_secret_here
```

Your complete `.env.local` should look like:

```bash
# GitHub OAuth Configuration (Development)
VITE_GITHUB_CLIENT_ID=Ov23liMi0uwOY48z9n14
VITE_GITHUB_REDIRECT_URI=http://localhost:5173/auth/github/callback

# Token Exchange Proxy
VITE_GITHUB_TOKEN_PROXY=http://localhost:3001/api/github/token

# GitHub Client Secret (NEVER commit this!)
GITHUB_CLIENT_SECRET=your_secret_here
```

⚠️ **IMPORTANT**: Never commit `.env.local` to git! It's already in `.gitignore`.

## Step 3: Start the Development Environment

You'll need to run TWO servers:

### Terminal 1: Start the Dev Proxy Server

```bash
# This handles the OAuth token exchange
node dev-proxy.js
```

You should see:
```
🚀 GitHub OAuth Dev Proxy Server
   Running on: http://localhost:3001
   Token endpoint: http://localhost:3001/api/github/token

⚙️  Configuration:
   GITHUB_CLIENT_ID: ✓ SET
   GITHUB_CLIENT_SECRET: ✓ SET
```

### Terminal 2: Start Vite Dev Server

```bash
npm run dev
```

Your app will run at `http://localhost:5173`

## Step 4: Test the OAuth Flow

1. Open `http://localhost:5173` in your browser
2. Click "Connect to GitHub" button (once we add it to the UI)
3. You'll be redirected to GitHub to authorize the app
4. After authorization, you'll be redirected back to `/auth/github/callback`
5. The app will exchange the code for an access token
6. You should see "Connected as @your-username"

## Troubleshooting

### "GITHUB_CLIENT_SECRET not set"

Make sure you added the client secret to `.env.local` and restarted the dev proxy server.

### "Failed to exchange token"

1. Check that both servers are running (proxy on :3001, Vite on :5173)
2. Verify your Client ID and Secret are correct
3. Check the dev proxy terminal for error messages

### "Invalid redirect URI"

Make sure the callback URL in your GitHub OAuth App settings exactly matches:
```
http://localhost:5173/auth/github/callback
```

### CORS Errors

The dev proxy is configured to allow CORS from `localhost:5173`. If you change the port, update `dev-proxy.js`.

## Production Deployment

### Option 1: Vercel (Recommended)

1. Deploy your app to Vercel: `vercel deploy`

2. Create a **Production** GitHub OAuth App:
   - Homepage URL: `https://your-project.vercel.app`
   - Callback URL: `https://your-project.vercel.app/auth/github/callback`

3. Add environment variables in Vercel dashboard:
   ```
   GITHUB_CLIENT_ID=your_prod_client_id
   GITHUB_CLIENT_SECRET=your_prod_client_secret
   ```

4. Update `.env.production`:
   ```bash
   VITE_GITHUB_CLIENT_ID=your_prod_client_id
   VITE_GITHUB_REDIRECT_URI=https://your-project.vercel.app/auth/github/callback
   VITE_GITHUB_TOKEN_PROXY=https://your-project.vercel.app/api/github/token
   ```

5. The `/api/github/token.ts` serverless function will automatically work on Vercel!

### Option 2: Netlify

1. Move `api/github/token.ts` to `netlify/functions/github-token.ts`
2. Update `VITE_GITHUB_TOKEN_PROXY` to:
   ```
   https://your-site.netlify.app/.netlify/functions/github-token
   ```
3. Add environment variables in Netlify dashboard
4. Deploy: `netlify deploy --prod`

## Security Notes

### DO NOT:
- ❌ Commit `.env.local` to git
- ❌ Share your Client Secret publicly
- ❌ Use the same OAuth App for dev and production
- ❌ Expose the Client Secret in browser code

### DO:
- ✅ Use separate OAuth Apps for dev and production
- ✅ Keep Client Secrets in environment variables only
- ✅ Use HTTPS in production
- ✅ Regularly rotate your Client Secrets

## Next Steps

Once OAuth is working:

1. ✅ Authentication - Done!
2. 🔄 GitHub API Integration - Create repositories, save files
3. 🔄 Local-First Storage - IndexedDB for offline work
4. 🔄 Background Sync - Auto-sync to GitHub
5. 🔄 Conflict Resolution - Handle merge conflicts

## Useful Commands

```bash
# Start dev proxy server
node dev-proxy.js

# Start Vite dev server
npm run dev

# Run both in production mode (after building)
npm run build
npm run preview

# Test API connection
curl http://localhost:3001/health
```

## Resources

- [GitHub OAuth Documentation](https://docs.github.com/en/apps/oauth-apps)
- [GitHub REST API](https://docs.github.com/en/rest)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
