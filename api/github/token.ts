/**
 * GitHub OAuth Token Exchange Endpoint
 *
 * This serverless function exchanges an authorization code for an access token.
 * The client secret is kept secure on the server side.
 *
 * Deployment:
 * - Vercel: Automatically detected in /api directory
 * - Netlify: Move to /netlify/functions
 *
 * Environment Variables Required:
 * - GITHUB_CLIENT_ID
 * - GITHUB_CLIENT_SECRET
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for local development
  const origin = req.headers.origin || 'http://localhost:5173';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are accepted'
    });
  }

  // Validate request body
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'Authorization code is required'
    });
  }

  // Check environment variables
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Missing GitHub OAuth credentials');
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'GitHub OAuth credentials not configured'
    });
  }

  try {
    // Exchange code for access token
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

    if (!response.ok) {
      throw new Error(`GitHub API responded with status ${response.status}`);
    }

    const data = await response.json();

    // Check for errors in response
    if (data.error) {
      return res.status(400).json({
        error: data.error,
        message: data.error_description || 'Failed to exchange code for token'
      });
    }

    // Return the access token
    return res.status(200).json({
      access_token: data.access_token,
      token_type: data.token_type,
      scope: data.scope,
    });

  } catch (error) {
    console.error('Token exchange error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to exchange authorization code for access token'
    });
  }
}
