<script lang="ts">
  /**
   * Button - Reusable button component with variants
   */
  import type { Snippet } from 'svelte';

  let {
    variant = 'primary',
    size = 'medium',
    disabled = false,
    type = 'button',
    onclick = () => {},
    children,
    class: className = ''
  }: {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onclick?: (event: MouseEvent) => void;
    children?: Snippet;
    class?: string;
  } = $props();

  const variantClasses = {
    primary: 'whisker-btn-primary',
    secondary: 'whisker-btn-secondary',
    outline: 'whisker-btn-outline',
    ghost: 'whisker-btn-ghost',
    danger: 'whisker-btn-danger',
  };

  const sizeClasses = {
    small: 'whisker-btn-sm',
    medium: 'whisker-btn-md',
    large: 'whisker-btn-lg',
  };
</script>

<button
  {type}
  {disabled}
  {onclick}
  class="whisker-btn {variantClasses[variant]} {sizeClasses[size]} {className}"
>
  {@render children?.()}
</button>

<style>
  .whisker-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--whisker-space-sm);
    font-family: var(--whisker-font-family);
    font-weight: var(--whisker-font-weight-medium);
    border: 1px solid transparent;
    border-radius: var(--whisker-radius-md);
    cursor: pointer;
    transition: all var(--whisker-transition-fast);
    white-space: nowrap;
  }

  .whisker-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Sizes */
  .whisker-btn-sm {
    padding: var(--whisker-space-xs) var(--whisker-space-md);
    font-size: var(--whisker-font-size-sm);
  }

  .whisker-btn-md {
    padding: var(--whisker-space-sm) var(--whisker-space-lg);
    font-size: var(--whisker-font-size-base);
  }

  .whisker-btn-lg {
    padding: var(--whisker-space-md) var(--whisker-space-xl);
    font-size: var(--whisker-font-size-lg);
  }

  /* Variants */
  .whisker-btn-primary {
    background-color: var(--whisker-color-primary);
    color: var(--whisker-color-text-inverse);
  }

  .whisker-btn-primary:hover:not(:disabled) {
    background-color: var(--whisker-color-primary-hover);
  }

  .whisker-btn-primary:active:not(:disabled) {
    background-color: var(--whisker-color-primary-active);
  }

  .whisker-btn-secondary {
    background-color: var(--whisker-color-secondary);
    color: var(--whisker-color-text-inverse);
  }

  .whisker-btn-secondary:hover:not(:disabled) {
    background-color: var(--whisker-color-secondary-hover);
  }

  .whisker-btn-outline {
    background-color: transparent;
    border-color: var(--whisker-color-border);
    color: var(--whisker-color-text);
  }

  .whisker-btn-outline:hover:not(:disabled) {
    background-color: var(--whisker-color-surface-hover);
    border-color: var(--whisker-color-border-dark);
  }

  .whisker-btn-ghost {
    background-color: transparent;
    color: var(--whisker-color-text);
  }

  .whisker-btn-ghost:hover:not(:disabled) {
    background-color: var(--whisker-color-surface-hover);
  }

  .whisker-btn-danger {
    background-color: var(--whisker-color-error);
    color: var(--whisker-color-text-inverse);
  }

  .whisker-btn-danger:hover:not(:disabled) {
    opacity: 0.9;
  }

  .whisker-btn:focus-visible {
    outline: 2px solid var(--whisker-color-primary);
    outline-offset: 2px;
  }
</style>
