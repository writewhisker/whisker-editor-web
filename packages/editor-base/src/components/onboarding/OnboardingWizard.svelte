<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { projectActions } from '../../stores/storyStateStore';

  const dispatch = createEventDispatcher();

  type Step = 'welcome' | 'experience' | 'template' | 'tutorial' | 'complete';

  let currentStep: Step = 'welcome';
  let userExperience: 'beginner' | 'intermediate' | 'expert' | null = null;
  let selectedTemplate: string | null = null;
  let wantsTutorial = false;

  const templates = [
    {
      id: 'blank',
      name: 'Blank Canvas',
      description: 'Start from scratch with an empty story',
      icon: '📄',
      difficulty: 'all',
    },
    {
      id: 'basic-adventure',
      name: 'Basic Adventure',
      description: 'A simple choose-your-own-adventure template',
      icon: '🗺️',
      difficulty: 'beginner',
    },
    {
      id: 'mystery',
      name: 'Mystery Story',
      description: 'Investigation-based narrative with clues',
      icon: '🔍',
      difficulty: 'intermediate',
    },
    {
      id: 'rpg',
      name: 'RPG Quest',
      description: 'Character stats, inventory, and combat',
      icon: '⚔️',
      difficulty: 'expert',
    },
    {
      id: 'romance',
      name: 'Romance Novel',
      description: 'Relationship tracking and multiple endings',
      icon: '💕',
      difficulty: 'intermediate',
    },
    {
      id: 'horror',
      name: 'Horror Story',
      description: 'Atmospheric storytelling with tension',
      icon: '👻',
      difficulty: 'intermediate',
    },
  ];

  function nextStep() {
    const steps: Step[] = ['welcome', 'experience', 'template', 'tutorial', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      currentStep = steps[currentIndex + 1];
    }
  }

  function prevStep() {
    const steps: Step[] = ['welcome', 'experience', 'template', 'tutorial', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      currentStep = steps[currentIndex - 1];
    }
  }

  function selectExperience(level: 'beginner' | 'intermediate' | 'expert') {
    userExperience = level;
    nextStep();
  }

  function selectTemplate(templateId: string) {
    selectedTemplate = templateId;
  }

  function finishOnboarding() {
    // Save user preferences
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('user_experience', userExperience || 'beginner');

    // Create initial story from template
    if (selectedTemplate && selectedTemplate !== 'blank') {
      // TODO: Load template from template service
      dispatch('complete', {
        template: selectedTemplate,
        showTutorial: wantsTutorial,
      });
    } else {
      dispatch('complete', {
        template: null,
        showTutorial: wantsTutorial,
      });
    }
  }

  function skip() {
    localStorage.setItem('onboarding_completed', 'true');
    dispatch('skip');
  }

  $: filteredTemplates = templates.filter(
    t => t.difficulty === 'all' ||
         t.difficulty === userExperience ||
         userExperience === 'expert'
  );
</script>

<div class="wizard-overlay">
  <div class="wizard-container">
    <button class="skip-btn" on:click={skip}>Skip for now</button>

    <!-- Progress Bar -->
    <div class="progress-bar">
      <div
        class="progress-fill"
        style="width: {
          currentStep === 'welcome' ? '20%' :
          currentStep === 'experience' ? '40%' :
          currentStep === 'template' ? '60%' :
          currentStep === 'tutorial' ? '80%' :
          '100%'
        }"
      ></div>
    </div>

    <!-- Welcome Step -->
    {#if currentStep === 'welcome'}
      <div class="step-content">
        <div class="welcome-animation">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="#4F46E5" opacity="0.1" class="pulse"/>
            <path d="M30 50 L10 45 M30 60 L10 60 M30 70 L10 75" stroke="#4F46E5" stroke-width="3" stroke-linecap="round" class="whisker left"/>
            <path d="M90 50 L110 45 M90 60 L110 60 M90 70 L110 75" stroke="#4F46E5" stroke-width="3" stroke-linecap="round" class="whisker right"/>
            <circle cx="48" cy="57" r="5" fill="#4F46E5"/>
            <circle cx="72" cy="57" r="5" fill="#4F46E5"/>
            <path d="M45 75 Q60 82 75 75" stroke="#4F46E5" stroke-width="3" fill="none"/>
          </svg>
        </div>

        <h1 class="step-title">Welcome to Whisker! 🎉</h1>
        <p class="step-description">
          Let's get you started on your interactive storytelling journey.
          This quick setup will help personalize your experience.
        </p>

        <div class="features-preview">
          <div class="feature-item">
            <span class="feature-icon">✏️</span>
            <span>Visual Story Editor</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🎯</span>
            <span>Branching Narratives</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🚀</span>
            <span>One-Click Publishing</span>
          </div>
        </div>

        <button class="primary-btn large" on:click={nextStep}>
          Let's Begin →
        </button>
      </div>
    {/if}

    <!-- Experience Level Step -->
    {#if currentStep === 'experience'}
      <div class="step-content">
        <h2 class="step-title">What's your experience level?</h2>
        <p class="step-description">
          This helps us recommend the right templates and features for you.
        </p>

        <div class="experience-options">
          <button
            class="experience-card"
            class:selected={userExperience === 'beginner'}
            on:click={() => selectExperience('beginner')}
          >
            <div class="experience-icon">🌱</div>
            <h3>New to Interactive Fiction</h3>
            <p>I'm just getting started with branching stories</p>
          </button>

          <button
            class="experience-card"
            class:selected={userExperience === 'intermediate'}
            on:click={() => selectExperience('intermediate')}
          >
            <div class="experience-icon">🎓</div>
            <h3>Some Experience</h3>
            <p>I've used Twine or similar tools before</p>
          </button>

          <button
            class="experience-card"
            class:selected={userExperience === 'expert'}
            on:click={() => selectExperience('expert')}
          >
            <div class="experience-icon">⚡</div>
            <h3>Expert Creator</h3>
            <p>I know my way around and want full control</p>
          </button>
        </div>
      </div>
    {/if}

    <!-- Template Selection Step -->
    {#if currentStep === 'template'}
      <div class="step-content">
        <h2 class="step-title">Choose a starting point</h2>
        <p class="step-description">
          Pick a template that matches your vision, or start with a blank canvas.
        </p>

        <div class="template-grid">
          {#each filteredTemplates as template}
            <button
              class="template-card"
              class:selected={selectedTemplate === template.id}
              on:click={() => selectTemplate(template.id)}
            >
              <div class="template-icon">{template.icon}</div>
              <h3>{template.name}</h3>
              <p>{template.description}</p>
              {#if template.difficulty !== 'all'}
                <span class="difficulty-badge">{template.difficulty}</span>
              {/if}
            </button>
          {/each}
        </div>

        <div class="step-actions">
          <button class="secondary-btn" on:click={prevStep}>
            ← Back
          </button>
          <button
            class="primary-btn"
            on:click={nextStep}
            disabled={!selectedTemplate}
          >
            Continue →
          </button>
        </div>
      </div>
    {/if}

    <!-- Tutorial Step -->
    {#if currentStep === 'tutorial'}
      <div class="step-content">
        <h2 class="step-title">Would you like a quick tour?</h2>
        <p class="step-description">
          We can show you around the editor with an interactive tutorial.
        </p>

        <div class="tutorial-options">
          <button
            class="tutorial-card"
            class:selected={wantsTutorial === true}
            on:click={() => { wantsTutorial = true; }}
          >
            <div class="tutorial-icon">🎯</div>
            <h3>Yes, show me around!</h3>
            <p>3-minute interactive tour of key features</p>
            <ul>
              <li>✓ Creating and editing passages</li>
              <li>✓ Adding choices and links</li>
              <li>✓ Testing your story</li>
              <li>✓ Publishing options</li>
            </ul>
          </button>

          <button
            class="tutorial-card"
            class:selected={wantsTutorial === false}
            on:click={() => { wantsTutorial = false; }}
          >
            <div class="tutorial-icon">🚀</div>
            <h3>No thanks, let me explore</h3>
            <p>Jump straight into creating</p>
            <ul>
              <li>→ Access help anytime with (?)</li>
              <li>→ Documentation available</li>
              <li>→ Video tutorials in menu</li>
            </ul>
          </button>
        </div>

        <div class="step-actions">
          <button class="secondary-btn" on:click={prevStep}>
            ← Back
          </button>
          <button
            class="primary-btn"
            on:click={nextStep}
            disabled={wantsTutorial === null}
          >
            Continue →
          </button>
        </div>
      </div>
    {/if}

    <!-- Complete Step -->
    {#if currentStep === 'complete'}
      <div class="step-content">
        <div class="complete-animation">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="#10b981" opacity="0.1" class="expand"/>
            <path d="M30 50 L45 65 L70 35" stroke="#10b981" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none" class="checkmark"/>
          </svg>
        </div>

        <h2 class="step-title">You're all set! 🎊</h2>
        <p class="step-description">
          Your workspace is ready. Let's start creating something amazing!
        </p>

        <div class="summary-box">
          <div class="summary-item">
            <span class="summary-label">Experience Level:</span>
            <span class="summary-value">{userExperience || 'Not specified'}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Starting Template:</span>
            <span class="summary-value">
              {templates.find(t => t.id === selectedTemplate)?.name || 'None'}
            </span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Tutorial:</span>
            <span class="summary-value">{wantsTutorial ? 'Yes' : 'No'}</span>
          </div>
        </div>

        <button class="primary-btn large" on:click={finishOnboarding}>
          Start Creating →
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .wizard-overlay {
    position: fixed;
    inset: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 2rem;
  }

  .wizard-container {
    background: white;
    border-radius: 1.5rem;
    padding: 3rem;
    max-width: 900px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
  }

  .skip-btn {
    position: absolute;
    top: 2rem;
    right: 2rem;
    background: none;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    font-weight: 500;
    transition: color 0.2s;
  }

  .skip-btn:hover {
    color: #1f2937;
  }

  .progress-bar {
    height: 6px;
    background: #e5e7eb;
    border-radius: 3px;
    margin-bottom: 3rem;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4F46E5 0%, #7c3aed 100%);
    transition: width 0.3s ease;
    border-radius: 3px;
  }

  .step-content {
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .welcome-animation {
    display: flex;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .pulse {
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.1; }
    50% { transform: scale(1.05); opacity: 0.15; }
  }

  .whisker {
    animation: wiggle 1.5s ease-in-out infinite;
  }

  .whisker.left {
    transform-origin: right;
  }

  .whisker.right {
    transform-origin: left;
  }

  @keyframes wiggle {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-5deg); }
    75% { transform: rotate(5deg); }
  }

  .step-title {
    font-size: 2.5rem;
    font-weight: 800;
    color: #1f2937;
    text-align: center;
    margin-bottom: 1rem;
  }

  .step-description {
    text-align: center;
    color: #6b7280;
    font-size: 1.125rem;
    margin-bottom: 2.5rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  .features-preview {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin-bottom: 3rem;
    flex-wrap: wrap;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #4b5563;
  }

  .feature-icon {
    font-size: 1.5rem;
  }

  .experience-options,
  .tutorial-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .experience-card,
  .tutorial-card {
    background: #f9fafb;
    border: 2px solid #e5e7eb;
    border-radius: 1rem;
    padding: 2rem;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .experience-card:hover,
  .tutorial-card:hover {
    border-color: #4F46E5;
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(79, 70, 229, 0.1);
  }

  .experience-card.selected,
  .tutorial-card.selected {
    background: #eef2ff;
    border-color: #4F46E5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  .experience-icon,
  .tutorial-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .experience-card h3,
  .tutorial-card h3 {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .experience-card p,
  .tutorial-card p {
    color: #6b7280;
    font-size: 0.875rem;
  }

  .tutorial-card {
    text-align: left;
  }

  .tutorial-card ul {
    margin-top: 1rem;
    list-style: none;
    padding: 0;
  }

  .tutorial-card li {
    color: #6b7280;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }

  .template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .template-card {
    background: #f9fafb;
    border: 2px solid #e5e7eb;
    border-radius: 1rem;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
    position: relative;
  }

  .template-card:hover {
    border-color: #4F46E5;
    transform: translateY(-2px);
  }

  .template-card.selected {
    background: #eef2ff;
    border-color: #4F46E5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  .template-icon {
    font-size: 3rem;
    margin-bottom: 0.75rem;
  }

  .template-card h3 {
    font-size: 1.125rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .template-card p {
    color: #6b7280;
    font-size: 0.875rem;
  }

  .difficulty-badge {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    background: #dbeafe;
    color: #1e40af;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .step-actions {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 2rem;
  }

  .primary-btn,
  .secondary-btn {
    padding: 1rem 2rem;
    border-radius: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    font-size: 1rem;
  }

  .primary-btn {
    background: #4F46E5;
    color: white;
    flex: 1;
  }

  .primary-btn:hover:not(:disabled) {
    background: #4338ca;
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(79, 70, 229, 0.2);
  }

  .primary-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .primary-btn.large {
    width: 100%;
    padding: 1.25rem 2.5rem;
    font-size: 1.125rem;
    margin-top: 2rem;
  }

  .secondary-btn {
    background: white;
    color: #4b5563;
    border: 2px solid #e5e7eb;
  }

  .secondary-btn:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  .complete-animation {
    display: flex;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .expand {
    animation: expand 0.6s ease forwards;
  }

  @keyframes expand {
    from { transform: scale(0); }
    to { transform: scale(1); }
  }

  .checkmark {
    stroke-dasharray: 100;
    stroke-dashoffset: 100;
    animation: drawCheck 0.6s ease forwards 0.3s;
  }

  @keyframes drawCheck {
    to { stroke-dashoffset: 0; }
  }

  .summary-box {
    background: #f9fafb;
    border-radius: 1rem;
    padding: 2rem;
    margin-bottom: 2rem;
  }

  .summary-item {
    display: flex;
    justify-content: space-between;
    padding: 1rem 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .summary-item:last-child {
    border-bottom: none;
  }

  .summary-label {
    color: #6b7280;
    font-weight: 500;
  }

  .summary-value {
    color: #1f2937;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .wizard-container {
      padding: 2rem 1.5rem;
    }

    .step-title {
      font-size: 2rem;
    }

    .experience-options,
    .tutorial-options {
      grid-template-columns: 1fr;
    }

    .template-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
