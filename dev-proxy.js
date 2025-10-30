/**
 * Simple local development proxy for GitHub OAuth token exchange
 *
 * This allows testing the OAuth flow locally without deploying to Vercel/Netlify
 *
 * Usage:
 *   1. Set GITHUB_CLIENT_SECRET environment variable
 *   2. Run: node dev-proxy.js
 *   3. Update .env.local: VITE_GITHUB_TOKEN_PROXY=http://localhost:3001/api/github/token
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = 3001;

// Enable CORS for local development
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Dev proxy server is running' });
});

// GitHub OAuth token exchange endpoint
app.post('/api/github/token', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'Authorization code is required'
    });
  }

  const clientId = process.env.GITHUB_CLIENT_ID || process.env.VITE_GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET');
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'GitHub OAuth credentials not configured. Set GITHUB_CLIENT_SECRET environment variable.'
    });
  }

  try {
    console.log('Exchanging code for token...');

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('GitHub error:', data.error, data.error_description);
      return res.status(400).json({
        error: data.error,
        message: data.error_description || 'Failed to exchange code for token'
      });
    }

    console.log('✓ Token exchange successful');

    return res.status(200).json({
      access_token: data.access_token,
      token_type: data.token_type,
      scope: data.scope,
    });

  } catch (error) {
    console.error('Token exchange error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 GitHub OAuth Dev Proxy Server`);
  console.log(`   Running on: http://localhost:${PORT}`);
  console.log(`   Token endpoint: http://localhost:${PORT}/api/github/token`);
  console.log(`\n⚙️  Configuration:`);
  console.log(`   GITHUB_CLIENT_ID: ${process.env.GITHUB_CLIENT_ID || process.env.VITE_GITHUB_CLIENT_ID || '❌ NOT SET'}`);
  console.log(`   GITHUB_CLIENT_SECRET: ${process.env.GITHUB_CLIENT_SECRET ? '✓ SET' : '❌ NOT SET'}`);
  console.log(`\n📝 Update your .env.local:`);
  console.log(`   VITE_GITHUB_TOKEN_PROXY=http://localhost:${PORT}/api/github/token\n`);
});
