<script lang="ts">
  export let message: string = 'Loading...';
  export let size: 'small' | 'medium' | 'large' = 'medium';

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };
</script>

<div class="flex flex-col items-center justify-center gap-3">
  <div class="relative {sizeClasses[size]}">
    <div class="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
    <div class="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
  </div>
  {#if message}
    <p class="text-sm text-gray-600">{message}</p>
  {/if}
</div>

<style>
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>
