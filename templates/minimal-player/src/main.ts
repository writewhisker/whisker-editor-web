/**
 * Minimal Player - Entry Point
 *
 * Lightweight story player with minimal dependencies
 */

import App from './App.svelte';
import './style.css';

const app = new App({
  target: document.getElementById('app')!,
});

export default app;
