<script lang="ts">
  /**
   * Kids Landing Page
   *
   * Fun, colorful landing page specifically designed for kids (ages 8-15).
   * Shows different messaging and visual style than the professional landing page.
   */

  export let onGetStarted: () => void;
  export let onBrowseTemplates: () => void;
  export let onParentInfo: () => void;
</script>

<div class="kids-landing">
  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-content">
      <!-- Big fun title -->
      <div class="welcome-badge">
        <span class="wave">👋</span>
        <span>Welcome Young Creator!</span>
      </div>

      <h1 class="hero-title">
        Create Your Own<br/>
        <span class="gradient-text">Amazing Adventures!</span>
      </h1>

      <p class="hero-subtitle">
        Build epic stories for Minecraft and Roblox! No coding needed - just your awesome imagination!
      </p>

      <!-- Big colorful buttons -->
      <div class="hero-actions">
        <button class="btn btn-primary" on:click={onGetStarted}>
          <span class="btn-emoji">🚀</span>
          <span>Start Creating!</span>
        </button>

        <button class="btn btn-secondary" on:click={onBrowseTemplates}>
          <span class="btn-emoji">🎨</span>
          <span>Browse Cool Templates</span>
        </button>
      </div>

      <!-- Fun stats for kids -->
      <div class="fun-stats">
        <div class="stat-card">
          <div class="stat-emoji">⭐</div>
          <div class="stat-text">Super Easy!</div>
        </div>
        <div class="stat-card">
          <div class="stat-emoji">🎮</div>
          <div class="stat-text">For Minecraft & Roblox</div>
        </div>
        <div class="stat-card">
          <div class="stat-emoji">🎉</div>
          <div class="stat-text">100% Free</div>
        </div>
      </div>
    </div>

    <!-- Visual side -->
    <div class="hero-visual">
      <div class="story-preview">
        <div class="preview-card card-1">
          <div class="card-emoji">🏰</div>
          <div class="card-title">Castle Quest</div>
          <div class="card-subtitle">Adventure Story</div>
        </div>
        <div class="preview-card card-2">
          <div class="card-emoji">🚀</div>
          <div class="card-title">Space Explorer</div>
          <div class="card-subtitle">Sci-Fi Adventure</div>
        </div>
        <div class="preview-card card-3">
          <div class="card-emoji">🐉</div>
          <div class="card-title">Dragon Trainer</div>
          <div class="card-subtitle">Fantasy Story</div>
        </div>
      </div>
    </div>
  </section>

  <!-- What You Can Do Section -->
  <section class="features">
    <h2 class="section-title">What Can You Create?</h2>

    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-emoji">🎮</div>
        <h3>Minecraft Adventures</h3>
        <p>Create quests, puzzles, and adventures for Minecraft! Add items, mobs, and cool locations to your story.</p>
      </div>

      <div class="feature-card">
        <div class="feature-emoji">🎭</div>
        <h3>Roblox Stories</h3>
        <p>Build roleplay stories and games for Roblox! Add badges, sounds, and interactive choices.</p>
      </div>

      <div class="feature-card">
        <div class="feature-emoji">🗺️</div>
        <h3>Story Maps</h3>
        <p>See your whole story like a map! Connect your pages and watch your adventure grow.</p>
      </div>

      <div class="feature-card">
        <div class="feature-emoji">⚡</div>
        <h3>Super Simple</h3>
        <p>No coding needed! Just write your story, add choices, and share it with friends.</p>
      </div>

      <div class="feature-card">
        <div class="feature-emoji">🎨</div>
        <h3>Cool Templates</h3>
        <p>Start with awesome templates for Minecraft and Roblox, or build from scratch!</p>
      </div>

      <div class="feature-card">
        <div class="feature-emoji">🛡️</div>
        <h3>Safe & Fun</h3>
        <p>Made just for kids! Safe, friendly, and easy to use. Parents love it too!</p>
      </div>
    </div>
  </section>

  <!-- How It Works Section -->
  <section class="how-it-works">
    <h2 class="section-title">How It Works</h2>

    <div class="steps">
      <div class="step">
        <div class="step-number">1</div>
        <div class="step-emoji">✏️</div>
        <h3>Write Your Story</h3>
        <p>Create pages for your adventure. Add what happens in each part!</p>
      </div>

      <div class="step-arrow">→</div>

      <div class="step">
        <div class="step-number">2</div>
        <div class="step-emoji">🔀</div>
        <h3>Add Choices</h3>
        <p>Let players make decisions! Where should they go next?</p>
      </div>

      <div class="step-arrow">→</div>

      <div class="step">
        <div class="step-number">3</div>
        <div class="step-emoji">🎮</div>
        <h3>Play & Share!</h3>
        <p>Test your story, then share it with friends in Minecraft or Roblox!</p>
      </div>
    </div>
  </section>

  <!-- Call to Action -->
  <section class="cta">
    <div class="cta-content">
      <h2>Ready to Create Something Amazing?</h2>
      <p>Join thousands of young creators making awesome stories!</p>
      <button class="btn btn-cta" on:click={onGetStarted}>
        <span class="btn-emoji">🌟</span>
        <span>Let's Go!</span>
      </button>
    </div>
  </section>

  <!-- Parent Info Link -->
  <section class="parent-info">
    <button class="parent-link" on:click={onParentInfo}>
      📋 Parent & Teacher Information
    </button>
  </section>
</div>

<style>
  .kids-landing {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* Hero Section */
  .hero {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    max-width: 1400px;
    margin: 0 auto;
    padding: 4rem 2rem;
    align-items: center;
  }

  .hero-content {
    color: white;
  }

  .welcome-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    padding: 0.75rem 1.5rem;
    border-radius: 50px;
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 2rem;
    animation: float 3s ease-in-out infinite;
  }

  .wave {
    font-size: 1.5rem;
    animation: wave 2s ease-in-out infinite;
  }

  @keyframes wave {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(20deg); }
    75% { transform: rotate(-20deg); }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  .hero-title {
    font-size: 4rem;
    font-weight: 900;
    line-height: 1.1;
    margin-bottom: 1.5rem;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  }

  .gradient-text {
    background: linear-gradient(90deg, #FFD700, #FFA500, #FF69B4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 3s ease-in-out infinite;
  }

  @keyframes shimmer {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }

  .hero-subtitle {
    font-size: 1.5rem;
    margin-bottom: 2.5rem;
    opacity: 0.95;
    line-height: 1.6;
  }

  .hero-actions {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 3rem;
    flex-wrap: wrap;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1.25rem 2.5rem;
    border: none;
    border-radius: 16px;
    font-size: 1.25rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  }

  .btn:hover {
    transform: translateY(-4px) scale(1.05);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
  }

  .btn:active {
    transform: translateY(-2px) scale(1.02);
  }

  .btn-primary {
    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
    color: #333;
  }

  .btn-secondary {
    background: linear-gradient(135deg, #FF69B4 0%, #FF1493 100%);
    color: white;
  }

  .btn-cta {
    background: linear-gradient(135deg, #00ff88 0%, #00cc66 100%);
    color: #333;
  }

  .btn-emoji {
    font-size: 1.5rem;
  }

  .fun-stats {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    padding: 1rem 1.5rem;
    border-radius: 16px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
  }

  .stat-emoji {
    font-size: 2rem;
  }

  .stat-text {
    font-weight: 700;
    font-size: 1.1rem;
  }

  /* Hero Visual */
  .hero-visual {
    position: relative;
    height: 500px;
  }

  .story-preview {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .preview-card {
    position: absolute;
    background: white;
    padding: 2rem;
    border-radius: 24px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    transform-origin: center;
    animation: cardFloat 6s ease-in-out infinite;
  }

  .card-1 {
    top: 10%;
    left: 10%;
    animation-delay: 0s;
  }

  .card-2 {
    top: 40%;
    right: 10%;
    animation-delay: 2s;
  }

  .card-3 {
    bottom: 10%;
    left: 25%;
    animation-delay: 4s;
  }

  @keyframes cardFloat {
    0%, 100% { transform: translateY(0) rotate(-2deg); }
    50% { transform: translateY(-20px) rotate(2deg); }
  }

  .card-emoji {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .card-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: #333;
    margin-bottom: 0.25rem;
  }

  .card-subtitle {
    color: #666;
    font-weight: 600;
  }

  /* Features Section */
  .features {
    background: white;
    padding: 6rem 2rem;
  }

  .section-title {
    text-align: center;
    font-size: 3rem;
    font-weight: 900;
    margin-bottom: 4rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .feature-card {
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    padding: 2.5rem;
    border-radius: 24px;
    text-align: center;
    transition: all 0.3s ease;
    border: 3px solid transparent;
  }

  .feature-card:hover {
    transform: translateY(-10px);
    border-color: #667eea;
    box-shadow: 0 15px 40px rgba(102, 126, 234, 0.3);
  }

  .feature-emoji {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .feature-card h3 {
    font-size: 1.75rem;
    font-weight: 800;
    color: #333;
    margin-bottom: 1rem;
  }

  .feature-card p {
    font-size: 1.1rem;
    color: #555;
    line-height: 1.6;
  }

  /* How It Works */
  .how-it-works {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 6rem 2rem;
    color: white;
  }

  .steps {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    flex-wrap: wrap;
  }

  .step {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    padding: 2.5rem;
    border-radius: 24px;
    text-align: center;
    flex: 1;
    min-width: 250px;
    max-width: 350px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    position: relative;
  }

  .step-number {
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
    color: #333;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 1.5rem;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  }

  .step-emoji {
    font-size: 3.5rem;
    margin: 1rem 0;
  }

  .step h3 {
    font-size: 1.75rem;
    font-weight: 800;
    margin-bottom: 1rem;
  }

  .step p {
    font-size: 1.1rem;
    opacity: 0.95;
    line-height: 1.6;
  }

  .step-arrow {
    font-size: 3rem;
    font-weight: 900;
    opacity: 0.5;
  }

  /* CTA Section */
  .cta {
    background: white;
    padding: 6rem 2rem;
    text-align: center;
  }

  .cta-content {
    max-width: 800px;
    margin: 0 auto;
  }

  .cta h2 {
    font-size: 3rem;
    font-weight: 900;
    color: #333;
    margin-bottom: 1.5rem;
  }

  .cta p {
    font-size: 1.5rem;
    color: #666;
    margin-bottom: 2.5rem;
  }

  /* Parent Info */
  .parent-info {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 3rem 2rem;
    text-align: center;
  }

  .parent-link {
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    border: 2px solid rgba(255, 255, 255, 0.4);
    color: white;
    padding: 1rem 2rem;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .parent-link:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }

  /* Mobile Responsive */
  @media (max-width: 968px) {
    .hero {
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    .hero-title {
      font-size: 3rem;
    }

    .hero-subtitle {
      font-size: 1.25rem;
    }

    .hero-visual {
      height: 400px;
    }

    .section-title {
      font-size: 2.5rem;
    }

    .step-arrow {
      display: none;
    }
  }

  @media (max-width: 640px) {
    .hero-title {
      font-size: 2.5rem;
    }

    .btn {
      font-size: 1.1rem;
      padding: 1rem 2rem;
    }

    .features-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
