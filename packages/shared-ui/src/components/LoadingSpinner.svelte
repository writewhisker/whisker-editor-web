<script lang="ts">
  /**
   * LoadingSpinner - Store-agnostic loading indicator
   * Accepts all configuration as props
   */

  let {
    message = 'Loading...',
    size = 'medium',
    color = 'primary'
  }: {
    message?: string;
    size?: 'small' | 'medium' | 'large';
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  } = $props();

  const sizeClasses = {
    small: 'whisker-w-4 whisker-h-4',
    medium: 'whisker-w-8 whisker-h-8',
    large: 'whisker-w-12 whisker-h-12',
  };

  const colorClasses = {
    primary: 'whisker-spinner-primary',
    secondary: 'whisker-spinner-secondary',
    success: 'whisker-spinner-success',
    warning: 'whisker-spinner-warning',
    error: 'whisker-spinner-error',
  };
</script>

<div class="whisker-loading-spinner">
  <div class="whisker-spinner-container {sizeClasses[size]}">
    <div class="whisker-spinner-track"></div>
    <div class="whisker-spinner-segment {colorClasses[color]}"></div>
  </div>
  {#if message}
    <p class="whisker-spinner-message">{message}</p>
  {/if}
</div>

<style>
  .whisker-loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--whisker-space-md);
  }

  .whisker-spinner-container {
    position: relative;
  }

  .whisker-w-4 {
    width: 1rem;
    height: 1rem;
  }

  .whisker-w-8 {
    width: 2rem;
    height: 2rem;
  }

  .whisker-w-12 {
    width: 3rem;
    height: 3rem;
  }

  .whisker-h-4 {
    height: 1rem;
  }

  .whisker-h-8 {
    height: 2rem;
  }

  .whisker-h-12 {
    height: 3rem;
  }

  .whisker-spinner-track,
  .whisker-spinner-segment {
    position: absolute;
    inset: 0;
    border: 3px solid;
    border-radius: var(--whisker-radius-full);
  }

  .whisker-spinner-track {
    border-color: var(--whisker-color-border);
    opacity: 0.2;
  }

  .whisker-spinner-segment {
    border-top-color: transparent;
    animation: whisker-spin 1s linear infinite;
  }

  .whisker-spinner-primary { border-color: var(--whisker-color-primary); }
  .whisker-spinner-secondary { border-color: var(--whisker-color-secondary); }
  .whisker-spinner-success { border-color: var(--whisker-color-success); }
  .whisker-spinner-warning { border-color: var(--whisker-color-warning); }
  .whisker-spinner-error { border-color: var(--whisker-color-error); }

  .whisker-spinner-message {
    margin: 0;
    font-size: var(--whisker-font-size-sm);
    color: var(--whisker-color-text-secondary);
  }

  @keyframes whisker-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
