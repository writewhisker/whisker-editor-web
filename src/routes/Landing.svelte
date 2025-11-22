<script lang="ts">
  export let onGetStarted: () => void;
  export let onTryDemo: () => void;
  export let onSignIn: () => void;
</script>

<div class="landing-page">
  <!-- Hero Section -->
  <section class="hero">
    <div class="container">
      <div class="hero-content">
        <h1>Create Interactive Stories</h1>
        <p class="subtitle">
          A modern visual editor for interactive fiction and choice-based narratives.
          No coding required.
        </p>

        <div class="cta-buttons">
          <button class="btn btn-primary" on:click={onGetStarted}>
            Get Started Free
          </button>
          <button class="btn btn-secondary" on:click={onTryDemo}>
            Try Demo
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="features">
    <div class="container">
      <h2>Key Features</h2>

      <div class="features-grid">
        <div class="feature">
          <div class="feature-icon">🎨</div>
          <h3>Visual Graph Editor</h3>
          <p>See your story structure at a glance with an intuitive drag-and-drop interface.</p>
        </div>

        <div class="feature">
          <div class="feature-icon">👥</div>
          <h3>Real-Time Collaboration</h3>
          <p>Write with your team and co-author stories together in real-time.</p>
        </div>

        <div class="feature">
          <div class="feature-icon">📱</div>
          <h3>Publish Anywhere</h3>
          <p>Export to HTML, Itch.io, GitHub Pages, or mobile apps with one click.</p>
        </div>

        <div class="feature">
          <div class="feature-icon">⚡</div>
          <h3>No Coding Required</h3>
          <p>Visual scripting with variables and conditions. Write code if you want to.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="cta">
    <div class="container">
      <h2>Ready to Start?</h2>
      <p>Join writers creating interactive narratives with Whisker</p>

      <button class="btn btn-primary" on:click={onGetStarted}>
        Create Your First Story
      </button>

      <p class="sign-in-link">
        Already have an account? <button class="link-btn" on:click={onSignIn}>Sign in</button>
      </p>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-brand">
          <h4>Whisker Editor</h4>
          <p>Open source interactive fiction editor</p>
        </div>

        <div class="footer-links">
          <div class="footer-section">
            <h5>Product</h5>
            <a href="#features">Features</a>
            <a href="#docs">Documentation</a>
            <a href="https://github.com/writewhisker/whisker-editor-web">GitHub</a>
          </div>

          <div class="footer-section">
            <h5>Legal</h5>
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <p>&copy; 2025 Whisker Editor. Open source under AGPL-3.0 License.</p>
      </div>
    </div>
  </footer>
</div>

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  .landing-page {
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #1a1a1a;
    background: #ffffff;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
  }

  /* Hero Section */
  .hero {
    padding: 6rem 0 8rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .hero-content {
    text-align: center;
    max-width: 800px;
    margin: 0 auto;
  }

  .hero h1 {
    font-size: 3.5rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    letter-spacing: -0.02em;
  }

  .subtitle {
    font-size: 1.25rem;
    line-height: 1.6;
    margin-bottom: 3rem;
    opacity: 0.95;
  }

  .cta-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn {
    padding: 1rem 2rem;
    border-radius: 8px;
    font-size: 1.0625rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    font-family: inherit;
  }

  .btn-primary {
    background: white;
    color: #667eea;
  }

  .btn-primary:hover {
    background: #f8f9fa;
    transform: translateY(-1px);
  }

  .btn-secondary {
    background: transparent;
    color: white;
    border: 2px solid white;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  /* Features Section */
  .features {
    padding: 6rem 0;
    background: #f8f9fa;
  }

  .features h2 {
    text-align: center;
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 4rem;
    color: #1a1a1a;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 3rem;
  }

  .feature {
    text-align: center;
  }

  .feature-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .feature h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: #1a1a1a;
  }

  .feature p {
    color: #666;
    line-height: 1.6;
  }

  /* CTA Section */
  .cta {
    padding: 6rem 0;
    text-align: center;
    background: white;
  }

  .cta h2 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: #1a1a1a;
  }

  .cta p {
    font-size: 1.125rem;
    color: #666;
    margin-bottom: 2.5rem;
  }

  .sign-in-link {
    margin-top: 1.5rem;
    font-size: 0.9375rem;
  }

  .link-btn {
    background: none;
    border: none;
    color: #667eea;
    text-decoration: underline;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
  }

  .link-btn:hover {
    color: #5568d3;
  }

  /* Footer */
  .footer {
    background: #1a1a1a;
    color: #ffffff;
    padding: 3rem 0 2rem;
  }

  .footer-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
    margin-bottom: 2rem;
  }

  .footer-brand h4 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .footer-brand p {
    color: #999;
    font-size: 0.9375rem;
  }

  .footer-links {
    display: flex;
    gap: 4rem;
    justify-content: flex-end;
  }

  .footer-section h5 {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #ffffff;
  }

  .footer-section a {
    display: block;
    color: #999;
    text-decoration: none;
    margin-bottom: 0.5rem;
    font-size: 0.9375rem;
  }

  .footer-section a:hover {
    color: #ffffff;
  }

  .footer-bottom {
    padding-top: 2rem;
    border-top: 1px solid #333;
    text-align: center;
    color: #999;
    font-size: 0.875rem;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .hero h1 {
      font-size: 2.5rem;
    }

    .subtitle {
      font-size: 1.125rem;
    }

    .features h2,
    .cta h2 {
      font-size: 2rem;
    }

    .features-grid {
      grid-template-columns: 1fr;
      gap: 2.5rem;
    }

    .footer-content {
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    .footer-links {
      justify-content: flex-start;
      gap: 3rem;
    }
  }

  @media (max-width: 480px) {
    .hero {
      padding: 4rem 0 5rem;
    }

    .hero h1 {
      font-size: 2rem;
    }

    .cta-buttons {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }

    .footer-links {
      flex-direction: column;
      gap: 2rem;
    }
  }
</style>
