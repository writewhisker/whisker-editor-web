<script lang="ts">
  import ErrorBoundary from './lib/components/ErrorBoundary.svelte';
  import App from './App.svelte';
</script>

<ErrorBoundary>
  <App />
</ErrorBoundary>
