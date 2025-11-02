<script lang="ts">
  export let onGetStarted: () => void;
  export let onTryDemo: () => void;
  export let onSignIn: () => void;
</script>

<div class="landing-page">
  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-content">
      <div class="logo">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Cat whiskers logo -->
          <circle cx="40" cy="40" r="35" fill="#4F46E5" opacity="0.1"/>
          <path d="M20 35 L5 30 M20 40 L5 40 M20 45 L5 50" stroke="#4F46E5" stroke-width="2" stroke-linecap="round"/>
          <path d="M60 35 L75 30 M60 40 L75 40 M60 45 L75 50" stroke="#4F46E5" stroke-width="2" stroke-linecap="round"/>
          <circle cx="32" cy="38" r="3" fill="#4F46E5"/>
          <circle cx="48" cy="38" r="3" fill="#4F46E5"/>
          <path d="M30 50 Q40 55 50 50" stroke="#4F46E5" stroke-width="2" fill="none"/>
        </svg>
      </div>

      <h1 class="hero-title">
        Create Interactive Stories<br/>
        <span class="gradient-text">Visually & Collaboratively</span>
      </h1>

      <p class="hero-subtitle">
        The modern visual editor for interactive fiction, branching narratives, and choice-based games.
        No coding required.
      </p>

      <div class="hero-actions">
        <button class="btn btn-primary" on:click={onGetStarted}>
          <span>Get Started Free</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>

        <button class="btn btn-secondary" on:click={onTryDemo}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
          </svg>
          <span>Try Demo Story</span>
        </button>
      </div>

      <div class="social-proof">
        <div class="proof-item">
          <span class="proof-number">10K+</span>
          <span class="proof-label">Stories Created</span>
        </div>
        <div class="proof-item">
          <span class="proof-number">100%</span>
          <span class="proof-label">Free & Open Source</span>
        </div>
        <div class="proof-item">
          <span class="proof-number">⭐ 500+</span>
          <span class="proof-label">GitHub Stars</span>
        </div>
      </div>
    </div>

    <div class="hero-visual">
      <!-- Interactive preview animation -->
      <div class="editor-preview">
        <div class="preview-window">
          <div class="window-header">
            <div class="window-dots">
              <span></span><span></span><span></span>
            </div>
            <span class="window-title">Whisker Editor</span>
          </div>
          <div class="window-content">
            <!-- Graph view mockup -->
            <div class="graph-mockup">
              <div class="node start-node">Start</div>
              <div class="connection"></div>
              <div class="node">Chapter 1</div>
              <div class="connection branch-left"></div>
              <div class="connection branch-right"></div>
              <div class="node choice-a">Choice A</div>
              <div class="node choice-b">Choice B</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="features">
    <h2 class="section-title">Everything You Need to Craft Engaging Stories</h2>

    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">🎨</div>
        <h3>Visual Graph Editor</h3>
        <p>See your story structure at a glance. Drag-and-drop passages, visualize branching paths, and navigate complex narratives with ease.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">👥</div>
        <h3>Real-Time Collaboration</h3>
        <p>Write with your team. Leave comments, suggest changes, and co-author stories in real-time.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🧪</div>
        <h3>Playtesting & Analytics</h3>
        <p>Test your stories and see where players get stuck. Track choices, drop-off rates, and optimize your narrative flow.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">📱</div>
        <h3>Publish Anywhere</h3>
        <p>Export to HTML, Itch.io, GitHub Pages, or mobile apps. One story, multiple platforms.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🎭</div>
        <h3>Rich Media Support</h3>
        <p>Add images, audio, animations, and custom styling. Create immersive experiences beyond plain text.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h3>No Coding Required</h3>
        <p>Visual scripting with blocks, variables, and conditions. Or write code if you want - it's your choice.</p>
      </div>
    </div>
  </section>

  <!-- Comparison Section -->
  <section class="comparison">
    <h2 class="section-title">Why Choose Whisker?</h2>

    <div class="comparison-table">
      <div class="comparison-row header">
        <div></div>
        <div>Whisker</div>
        <div>Twine</div>
        <div>Ink</div>
      </div>

      <div class="comparison-row">
        <div>Modern UI/UX</div>
        <div class="check">✓</div>
        <div class="cross">—</div>
        <div class="check">✓</div>
      </div>

      <div class="comparison-row">
        <div>Real-time Collaboration</div>
        <div class="check">✓</div>
        <div class="cross">—</div>
        <div class="cross">—</div>
      </div>

      <div class="comparison-row">
        <div>Cloud Sync</div>
        <div class="check">✓</div>
        <div class="cross">—</div>
        <div class="cross">—</div>
      </div>

      <div class="comparison-row">
        <div>Advanced Analytics</div>
        <div class="check">✓</div>
        <div class="cross">—</div>
        <div class="partial">Partial</div>
      </div>

      <div class="comparison-row">
        <div>Visual Scripting</div>
        <div class="check">✓</div>
        <div class="cross">—</div>
        <div class="cross">—</div>
      </div>

      <div class="comparison-row">
        <div>Mobile Support</div>
        <div class="check">✓</div>
        <div class="cross">—</div>
        <div class="partial">Partial</div>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="cta">
    <h2>Ready to Start Your Story?</h2>
    <p>Join thousands of writers crafting interactive narratives with Whisker</p>

    <button class="btn btn-primary large" on:click={onGetStarted}>
      <span>Create Your First Story</span>
      <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
      </svg>
    </button>

    <p class="cta-note">Already have an account? <button class="link" on:click={onSignIn}>Sign in</button></p>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-section">
        <h4>Product</h4>
        <a href="#features">Features</a>
        <a href="#templates">Templates</a>
        <a href="#pricing">Pricing</a>
        <a href="#changelog">Changelog</a>
      </div>

      <div class="footer-section">
        <h4>Resources</h4>
        <a href="#docs">Documentation</a>
        <a href="#tutorials">Tutorials</a>
        <a href="#examples">Examples</a>
        <a href="#community">Community</a>
      </div>

      <div class="footer-section">
        <h4>Company</h4>
        <a href="#about">About</a>
        <a href="#blog">Blog</a>
        <a href="https://github.com/writewhisker/whisker-editor-web">GitHub</a>
        <a href="#contact">Contact</a>
      </div>

      <div class="footer-section">
        <h4>Legal</h4>
        <a href="#privacy">Privacy</a>
        <a href="#terms">Terms</a>
        <a href="#security">Security</a>
      </div>
    </div>

    <div class="footer-bottom">
      <p>&copy; 2025 Whisker Editor. Open source under MIT License.</p>
    </div>
  </footer>
</div>

<style>
  .landing-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  /* Hero Section */
  .hero {
    min-height: 90vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    align-items: center;
    padding: 4rem 6rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .logo {
    margin-bottom: 2rem;
    animation: float 3s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  .hero-title {
    font-size: 4rem;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 1.5rem;
  }

  .gradient-text {
    background: linear-gradient(90deg, #ffd89b 0%, #19547b 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-subtitle {
    font-size: 1.25rem;
    line-height: 1.6;
    opacity: 0.9;
    margin-bottom: 2.5rem;
    max-width: 500px;
  }

  .hero-actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 3rem;
  }

  .btn {
    padding: 1rem 2rem;
    border-radius: 0.75rem;
    font-weight: 600;
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border: none;
  }

  .btn-primary {
    background: white;
    color: #4F46E5;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .btn.large {
    padding: 1.25rem 3rem;
    font-size: 1.25rem;
  }

  .social-proof {
    display: flex;
    gap: 3rem;
  }

  .proof-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .proof-number {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .proof-label {
    font-size: 0.875rem;
    opacity: 0.8;
  }

  /* Hero Visual */
  .editor-preview {
    perspective: 1000px;
  }

  .preview-window {
    background: white;
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
    transform: rotateY(-5deg) rotateX(5deg);
    transition: transform 0.3s ease;
  }

  .preview-window:hover {
    transform: rotateY(0) rotateX(0);
  }

  .window-header {
    background: #f3f4f6;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .window-dots {
    display: flex;
    gap: 0.5rem;
  }

  .window-dots span {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #d1d5db;
  }

  .window-dots span:nth-child(1) { background: #ef4444; }
  .window-dots span:nth-child(2) { background: #f59e0b; }
  .window-dots span:nth-child(3) { background: #10b981; }

  .window-title {
    color: #6b7280;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .window-content {
    padding: 2rem;
    background: #fafafa;
    min-height: 400px;
  }

  .graph-mockup {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
  }

  .node {
    background: #4F46E5;
    color: white;
    padding: 1rem 2rem;
    border-radius: 0.5rem;
    font-weight: 600;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.5s ease forwards;
    opacity: 0;
  }

  .node.start-node {
    animation-delay: 0.2s;
  }

  .node:nth-child(3) {
    animation-delay: 0.4s;
  }

  .node.choice-a {
    animation-delay: 0.6s;
    margin-left: -4rem;
  }

  .node.choice-b {
    animation-delay: 0.6s;
    margin-right: -4rem;
  }

  @keyframes slideIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
    from {
      transform: translateY(-20px);
    }
  }

  /* Features Section */
  .features, .comparison, .cta {
    background: white;
    color: #1f2937;
    padding: 6rem 4rem;
  }

  .section-title {
    font-size: 2.5rem;
    font-weight: 800;
    text-align: center;
    margin-bottom: 4rem;
    color: #1f2937;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .feature-card {
    background: #f9fafb;
    padding: 2rem;
    border-radius: 1rem;
    transition: all 0.3s ease;
  }

  .feature-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }

  .feature-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .feature-card h3 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
    color: #1f2937;
  }

  .feature-card p {
    color: #6b7280;
    line-height: 1.6;
  }

  /* Comparison Table */
  .comparison-table {
    max-width: 800px;
    margin: 0 auto;
    background: #f9fafb;
    border-radius: 1rem;
    overflow: hidden;
  }

  .comparison-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .comparison-row.header {
    background: #4F46E5;
    color: white;
    font-weight: 700;
  }

  .comparison-row div {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .comparison-row div:first-child {
    justify-content: flex-start;
    font-weight: 600;
  }

  .check {
    color: #10b981;
    font-size: 1.5rem;
  }

  .cross {
    color: #ef4444;
    font-size: 1.5rem;
  }

  .partial {
    color: #f59e0b;
    font-size: 0.875rem;
  }

  /* CTA Section */
  .cta {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    text-align: center;
  }

  .cta h2 {
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 1rem;
  }

  .cta p {
    font-size: 1.25rem;
    opacity: 0.9;
    margin-bottom: 2.5rem;
  }

  .cta-note {
    margin-top: 1.5rem;
    font-size: 1rem;
    opacity: 0.9;
  }

  .link {
    background: none;
    border: none;
    color: white;
    text-decoration: underline;
    cursor: pointer;
    font-size: 1rem;
  }

  /* Footer */
  .footer {
    background: #1f2937;
    color: white;
    padding: 4rem 4rem 2rem;
  }

  .footer-content {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 3rem;
    max-width: 1200px;
    margin: 0 auto 3rem;
  }

  .footer-section h4 {
    font-weight: 700;
    margin-bottom: 1rem;
    color: white;
  }

  .footer-section a {
    display: block;
    color: #9ca3af;
    text-decoration: none;
    margin-bottom: 0.75rem;
    transition: color 0.2s;
  }

  .footer-section a:hover {
    color: white;
  }

  .footer-bottom {
    text-align: center;
    padding-top: 2rem;
    border-top: 1px solid #374151;
    color: #9ca3af;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .hero {
      grid-template-columns: 1fr;
      text-align: center;
    }

    .hero-content {
      order: 2;
    }

    .hero-visual {
      order: 1;
    }

    .hero-title {
      font-size: 3rem;
    }

    .hero-actions {
      justify-content: center;
    }

    .social-proof {
      justify-content: center;
    }
  }

  @media (max-width: 768px) {
    .hero {
      padding: 2rem;
    }

    .hero-title {
      font-size: 2.5rem;
    }

    .hero-actions {
      flex-direction: column;
    }

    .social-proof {
      flex-direction: column;
      gap: 1.5rem;
    }

    .features-grid {
      grid-template-columns: 1fr;
    }

    .footer-content {
      grid-template-columns: repeat(2, 1fr);
    }

    .comparison-row {
      grid-template-columns: 1.5fr 1fr 1fr 1fr;
      font-size: 0.875rem;
      padding: 1rem;
    }
  }
</style>
