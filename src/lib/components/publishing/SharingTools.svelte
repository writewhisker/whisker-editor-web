<script lang="ts">
  import {
    copyToClipboard,
    generateEmbedCode,
    generateQRCode,
    generateSocialShareUrl,
    generateEmailShareUrl,
  } from '$lib/publishing/sharingUtils';

  // Props
  let {
    url = '',
    title = '',
    description = '',
    open = $bindable(false),
  }: {
    url?: string;
    title?: string;
    description?: string;
    open?: boolean;
  } = $props();

  // State
  let activeTab = $state<'link' | 'embed' | 'qr' | 'social'>('link');
  let embedWidth = $state(800);
  let embedHeight = $state(600);
  let copyFeedback = $state<string | null>(null);
  let qrCodeUrl = $state('');

  // Generate QR code when tab is selected
  $effect(() => {
    if (activeTab === 'qr' && url) {
      qrCodeUrl = generateQRCode(url);
    }
  });

  async function handleCopy(text: string, label: string) {
    const success = await copyToClipboard(text);
    if (success) {
      copyFeedback = `${label} copied!`;
      setTimeout(() => {
        copyFeedback = null;
      }, 2000);
    } else {
      copyFeedback = 'Failed to copy';
      setTimeout(() => {
        copyFeedback = null;
      }, 2000);
    }
  }

  function handleCopyLink() {
    handleCopy(url, 'Link');
  }

  function handleCopyEmbed() {
    const embedCode = generateEmbedCode({
      type: 'embed',
      url,
      title,
      embedWidth,
      embedHeight,
    });
    handleCopy(embedCode, 'Embed code');
  }

  function handleSocialShare(platform: 'twitter' | 'facebook' | 'reddit') {
    const shareUrl = generateSocialShareUrl(platform, url, title, description);
    window.open(shareUrl, '_blank', 'width=600,height=400');
  }

  function handleEmailShare() {
    const emailUrl = generateEmailShareUrl(url, title, description);
    window.location.href = emailUrl;
  }

  function handleClose() {
    open = false;
  }
</script>

{#if open}
  <div class="dialog-overlay" onclick={handleClose} role="presentation">
    <div
      class="dialog"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-labelledby="sharing-title"
      aria-modal="true"
    >
      <div class="dialog-header">
        <h2 id="sharing-title">Share Story</h2>
        <button class="close-btn" onclick={handleClose} aria-label="Close dialog">×</button>
      </div>

      {#if copyFeedback}
        <div class="feedback-message">{copyFeedback}</div>
      {/if}

      <div class="tabs">
        <button
          class="tab"
          class:active={activeTab === 'link'}
          onclick={() => (activeTab = 'link')}
        >
          Link
        </button>
        <button
          class="tab"
          class:active={activeTab === 'embed'}
          onclick={() => (activeTab = 'embed')}
        >
          Embed
        </button>
        <button class="tab" class:active={activeTab === 'qr'} onclick={() => (activeTab = 'qr')}>
          QR Code
        </button>
        <button
          class="tab"
          class:active={activeTab === 'social'}
          onclick={() => (activeTab = 'social')}
        >
          Social
        </button>
      </div>

      <div class="dialog-content">
        {#if activeTab === 'link'}
          <div class="tab-content">
            <p class="help-text">Share this direct link to your story:</p>
            <div class="input-group">
              <input type="text" readonly value={url} class="url-input" />
              <button class="btn btn-primary" onclick={handleCopyLink}>Copy</button>
            </div>
          </div>
        {/if}

        {#if activeTab === 'embed'}
          <div class="tab-content">
            <p class="help-text">Embed your story in a website:</p>

            <div class="form-group">
              <label for="embed-width">Width (px)</label>
              <input type="number" id="embed-width" bind:value={embedWidth} min="300" max="2000" />
            </div>

            <div class="form-group">
              <label for="embed-height">Height (px)</label>
              <input
                type="number"
                id="embed-height"
                bind:value={embedHeight}
                min="300"
                max="2000"
              />
            </div>

            <div class="input-group">
              <textarea
                readonly
                rows="4"
                class="embed-code"
                value={generateEmbedCode({
                  type: 'embed',
                  url,
                  title,
                  embedWidth,
                  embedHeight,
                })}
              ></textarea>
            </div>

            <button class="btn btn-primary full-width" onclick={handleCopyEmbed}>
              Copy Embed Code
            </button>
          </div>
        {/if}

        {#if activeTab === 'qr'}
          <div class="tab-content">
            <p class="help-text">Scan this QR code to access your story:</p>
            {#if qrCodeUrl}
              <div class="qr-container">
                <img src={qrCodeUrl} alt="QR Code" class="qr-code" />
              </div>
              <button
                class="btn btn-secondary full-width"
                onclick={() => window.open(qrCodeUrl, '_blank')}
              >
                Download QR Code
              </button>
            {:else}
              <p class="help-text">Generating QR code...</p>
            {/if}
          </div>
        {/if}

        {#if activeTab === 'social'}
          <div class="tab-content">
            <p class="help-text">Share on social media:</p>

            <div class="social-buttons">
              <button class="social-btn twitter" onclick={() => handleSocialShare('twitter')}>
                <span class="icon">🐦</span>
                Twitter
              </button>

              <button class="social-btn facebook" onclick={() => handleSocialShare('facebook')}>
                <span class="icon">📘</span>
                Facebook
              </button>

              <button class="social-btn reddit" onclick={() => handleSocialShare('reddit')}>
                <span class="icon">🔴</span>
                Reddit
              </button>

              <button class="social-btn email" onclick={handleEmailShare}>
                <span class="icon">✉️</span>
                Email
              </button>
            </div>
          </div>
        {/if}
      </div>

      <div class="dialog-footer">
        <button class="btn btn-secondary" onclick={handleClose}>Close</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .dialog {
    background: var(--bg-primary, white);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .dialog-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text-primary, #333);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    line-height: 1;
    cursor: pointer;
    color: var(--text-secondary, #666);
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .close-btn:hover {
    background: var(--bg-hover, #f0f0f0);
  }

  .feedback-message {
    background: #4caf50;
    color: white;
    padding: 12px 20px;
    text-align: center;
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .tab {
    flex: 1;
    padding: 12px 16px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary, #666);
    transition: all 0.2s;
  }

  .tab:hover {
    background: var(--bg-hover, #f5f5f5);
  }

  .tab.active {
    color: var(--accent-color, #3498db);
    border-bottom-color: var(--accent-color, #3498db);
  }

  .dialog-content {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

  .tab-content {
    animation: fadeIn 0.2s ease-out;
  }

  .help-text {
    font-size: 14px;
    color: var(--text-secondary, #666);
    margin-bottom: 16px;
  }

  .input-group {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .url-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    font-size: 14px;
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }

  .embed-code {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    font-size: 12px;
    font-family: monospace;
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
    resize: vertical;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    margin-bottom: 4px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary, #333);
  }

  .form-group input[type='number'] {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    font-size: 14px;
    background: var(--bg-primary, white);
    color: var(--text-primary, #333);
  }

  .qr-container {
    display: flex;
    justify-content: center;
    margin: 20px 0;
  }

  .qr-code {
    max-width: 200px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
  }

  .social-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .social-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    background: var(--bg-primary, white);
    color: var(--text-primary, #333);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .social-btn:hover {
    background: var(--bg-hover, #f0f0f0);
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .social-btn .icon {
    font-size: 20px;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    padding: 20px;
    border-top: 1px solid var(--border-color, #e0e0e0);
  }

  .btn {
    padding: 10px 20px;
    border-radius: 4px;
    border: none;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }

  .btn-secondary:hover {
    background: var(--bg-hover, #e0e0e0);
  }

  .btn-primary {
    background: var(--accent-color, #3498db);
    color: white;
  }

  .btn-primary:hover {
    background: var(--accent-hover, #2980b9);
  }

  .full-width {
    width: 100%;
  }
</style>
