import { mount } from 'svelte'
import './app.css'
import AppWrapper from './AppWrapper.svelte'

/**
 * Safari Mobile Viewport Height Fix
 *
 * Safari mobile changes the viewport height when the address bar appears/disappears.
 * This causes layout issues with 100vh. We fix this by:
 * 1. Setting a CSS custom property with the actual viewport height
 * 2. Updating it on resize and orientation change
 *
 * This ensures the app always fills the available viewport correctly.
 */
function setSafariMobileViewportHeight() {
  // Get the actual viewport height
  const vh = window.innerHeight * 0.01;
  // Set the CSS custom property to the root element
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
}

// Set initial height
setSafariMobileViewportHeight();

// Update on resize (handles address bar show/hide)
window.addEventListener('resize', setSafariMobileViewportHeight);

// Update on orientation change (landscape/portrait)
window.addEventListener('orientationchange', () => {
  // Small delay to ensure the new dimensions are available
  setTimeout(setSafariMobileViewportHeight, 100);
});

// Update on visual viewport resize (more accurate for mobile)
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', setSafariMobileViewportHeight);
}

const app = mount(AppWrapper, {
  target: document.getElementById('app')!,
})

export default app
