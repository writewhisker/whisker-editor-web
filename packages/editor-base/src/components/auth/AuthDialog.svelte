<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { githubUser, isAuthenticated, startGitHubAuth } from '@writewhisker/github';

  const dispatch = createEventDispatcher();

  export let mode: 'signin' | 'signup' | 'guest' = 'signup';

  let email = '';
  let password = '';
  let name = '';
  let isLoading = false;
  let error = '';

  async function handleEmailAuth() {
    isLoading = true;
    error = '';

    try {
      // TODO: Implement Supabase email auth
      console.log('Email auth not yet implemented');
      error = 'Email authentication coming soon! Use GitHub for now.';
    } catch (err: any) {
      error = err.message || 'Authentication failed';
    } finally {
      isLoading = false;
    }
  }

  async function handleGitHubAuth() {
    isLoading = true;
    error = '';

    try {
      await startGitHubAuth();
    } catch (err: any) {
      error = err.message || 'GitHub authentication failed';
      isLoading = false;
    }
  }

  async function handleGoogleAuth() {
    isLoading = true;
    error = '';

    try {
      // TODO: Implement Google OAuth
      console.log('Google auth not yet implemented');
      error = 'Google authentication coming soon!';
    } catch (err: any) {
      error = err.message || 'Google authentication failed';
    } finally {
      isLoading = false;
    }
  }

  function handleGuestMode() {
    dispatch('guest');
  }

  function toggleMode() {
    mode = mode === 'signin' ? 'signup' : 'signin';
    error = '';
  }
</script>

<div class="auth-dialog">
  <div class="auth-container">
    <button class="close-btn" on:click={() => dispatch('close')}>
      ✕
    </button>

    <!-- Logo -->
    <div class="auth-logo">
      <svg width="60" height="60" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="35" fill="#4F46E5" opacity="0.1"/>
        <path d="M20 35 L5 30 M20 40 L5 40 M20 45 L5 50" stroke="#4F46E5" stroke-width="2" stroke-linecap="round"/>
        <path d="M60 35 L75 30 M60 40 L75 40 M60 45 L75 50" stroke="#4F46E5" stroke-width="2" stroke-linecap="round"/>
        <circle cx="32" cy="38" r="3" fill="#4F46E5"/>
        <circle cx="48" cy="38" r="3" fill="#4F46E5"/>
        <path d="M30 50 Q40 55 50 50" stroke="#4F46E5" stroke-width="2" fill="none"/>
      </svg>
    </div>

    <h2 class="auth-title">
      {mode === 'signin' ? 'Welcome Back' : 'Create Your Account'}
    </h2>

    <p class="auth-subtitle">
      {mode === 'signin'
        ? 'Sign in to continue your stories'
        : 'Start creating interactive narratives today'}
    </p>

    {#if error}
      <div class="error-message">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293z" clip-rule="evenodd"/>
        </svg>
        <span>{error}</span>
      </div>
    {/if}

    <!-- Social Auth Buttons -->
    <div class="social-auth">
      <button class="auth-btn github" on:click={handleGitHubAuth} disabled={isLoading}>
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
          <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.220-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"/>
        </svg>
        <span>Continue with GitHub</span>
      </button>

      <button class="auth-btn google" on:click={handleGoogleAuth} disabled={isLoading}>
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span>Continue with Google</span>
      </button>
    </div>

    <div class="divider">
      <span>or continue with email</span>
    </div>

    <!-- Email/Password Form -->
    <form class="auth-form" on:submit|preventDefault={handleEmailAuth}>
      {#if mode === 'signup'}
        <div class="form-group">
          <label for="name">Name</label>
          <input
            id="name"
            type="text"
            bind:value={name}
            placeholder="Your name"
            required
            disabled={isLoading}
          />
        </div>
      {/if}

      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          placeholder="you@example.com"
          required
          disabled={isLoading}
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          placeholder="••••••••"
          required
          disabled={isLoading}
        />
      </div>

      {#if mode === 'signin'}
        <div class="form-footer">
          <button type="button" class="link-btn">Forgot password?</button>
        </div>
      {/if}

      <button type="submit" class="submit-btn" disabled={isLoading}>
        {#if isLoading}
          <svg class="spinner" width="20" height="20" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
            <path fill="currentColor" d="M12 2a10 10 0 0110 10h-4a6 6 0 00-6-6V2z"/>
          </svg>
        {:else}
          <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
        {/if}
      </button>
    </form>

    <!-- Toggle Mode -->
    <div class="auth-toggle">
      {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
      <button class="link-btn" on:click={toggleMode}>
        {mode === 'signin' ? 'Sign up' : 'Sign in'}
      </button>
    </div>

    <!-- Guest Mode -->
    <div class="guest-mode">
      <button class="link-btn" on:click={handleGuestMode}>
        Continue as Guest
      </button>
      <p class="guest-note">Limited features, no cloud save</p>
    </div>
  </div>
</div>

<style>
  .auth-dialog {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .auth-container {
    background: white;
    border-radius: 1rem;
    padding: 3rem;
    max-width: 480px;
    width: 100%;
    position: relative;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
    max-height: 90vh;
    overflow-y: auto;
  }

  .close-btn {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #9ca3af;
    cursor: pointer;
    padding: 0.5rem;
    line-height: 1;
    transition: color 0.2s;
  }

  .close-btn:hover {
    color: #1f2937;
  }

  .auth-logo {
    display: flex;
    justify-content: center;
    margin-bottom: 1.5rem;
  }

  .auth-title {
    font-size: 2rem;
    font-weight: 800;
    text-align: center;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .auth-subtitle {
    text-align: center;
    color: #6b7280;
    margin-bottom: 2rem;
  }

  .error-message {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
  }

  .social-auth {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .auth-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.875rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid #e5e7eb;
    background: white;
    color: #1f2937;
  }

  .auth-btn:hover:not(:disabled) {
    background: #f9fafb;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .auth-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .auth-btn.github {
    background: #24292e;
    color: white;
    border-color: #24292e;
  }

  .auth-btn.github:hover:not(:disabled) {
    background: #1b1f23;
  }

  .auth-btn.google {
    border-color: #dadce0;
  }

  .divider {
    position: relative;
    text-align: center;
    margin: 1.5rem 0;
  }

  .divider::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 1px;
    background: #e5e7eb;
  }

  .divider span {
    position: relative;
    background: white;
    padding: 0 1rem;
    color: #9ca3af;
    font-size: 0.875rem;
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-weight: 600;
    color: #374151;
    font-size: 0.875rem;
  }

  .form-group input {
    padding: 0.875rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 1rem;
    transition: all 0.2s;
  }

  .form-group input:focus {
    outline: none;
    border-color: #4F46E5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  .form-group input:disabled {
    background: #f9fafb;
    cursor: not-allowed;
  }

  .form-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: -0.5rem;
  }

  .link-btn {
    background: none;
    border: none;
    color: #4F46E5;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    font-size: 0.875rem;
  }

  .link-btn:hover {
    text-decoration: underline;
  }

  .submit-btn {
    background: #4F46E5;
    color: white;
    padding: 0.875rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .submit-btn:hover:not(:disabled) {
    background: #4338ca;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(79, 70, 229, 0.25);
  }

  .submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .auth-toggle {
    text-align: center;
    margin-top: 1.5rem;
    color: #6b7280;
    font-size: 0.875rem;
  }

  .guest-mode {
    text-align: center;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .guest-note {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: #9ca3af;
  }

  @media (max-width: 640px) {
    .auth-container {
      padding: 2rem 1.5rem;
    }

    .auth-title {
      font-size: 1.5rem;
    }
  }
</style>
