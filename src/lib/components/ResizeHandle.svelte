<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let orientation: 'vertical' | 'horizontal' = 'vertical';
  export let minSize = 200;
  export let maxSize = 800;

  const dispatch = createEventDispatcher<{
    resize: { delta: number };
  }>();

  let isDragging = false;
  let startPos = 0;

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    isDragging = true;
    startPos = orientation === 'vertical' ? e.clientX : e.clientY;
    document.body.style.cursor = orientation === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    // Add global listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;

    const currentPos = orientation === 'vertical' ? e.clientX : e.clientY;
    const delta = currentPos - startPos;

    dispatch('resize', { delta });
    startPos = currentPos;
  }

  function handleMouseUp() {
    if (!isDragging) return;

    isDragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Remove global listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }
</script>

<div
  class="resize-handle {orientation === 'vertical' ? 'resize-handle-vertical' : 'resize-handle-horizontal'}"
  on:mousedown={handleMouseDown}
  role="separator"
  aria-orientation={orientation}
  tabindex="0"
>
  <div class="resize-handle-indicator"></div>
</div>

<style>
  .resize-handle {
    position: relative;
    flex-shrink: 0;
    background-color: transparent;
    transition: background-color 0.15s ease;
    z-index: 10;
  }

  .resize-handle-vertical {
    width: 6px;
    cursor: col-resize;
    border-left: 1px solid rgb(209 213 219); /* border-gray-300 */
    border-right: 1px solid rgb(209 213 219);
  }

  .resize-handle-horizontal {
    height: 6px;
    cursor: row-resize;
    border-top: 1px solid rgb(209 213 219);
    border-bottom: 1px solid rgb(209 213 219);
  }

  .resize-handle:hover {
    background-color: rgb(219 234 254); /* bg-blue-100 */
  }

  .resize-handle:active {
    background-color: rgb(191 219 254); /* bg-blue-200 */
  }

  .resize-handle-indicator {
    position: absolute;
    background-color: rgb(156 163 175); /* bg-gray-400 */
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .resize-handle-vertical .resize-handle-indicator {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 2px;
    height: 40px;
    border-radius: 1px;
  }

  .resize-handle-horizontal .resize-handle-indicator {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 40px;
    height: 2px;
    border-radius: 1px;
  }

  .resize-handle:hover .resize-handle-indicator {
    opacity: 0.5;
  }

  .resize-handle:active .resize-handle-indicator {
    opacity: 1;
    background-color: rgb(59 130 246); /* bg-blue-500 */
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .resize-handle-vertical {
      border-left-color: rgb(75 85 99); /* border-gray-600 */
      border-right-color: rgb(75 85 99);
    }

    .resize-handle-horizontal {
      border-top-color: rgb(75 85 99);
      border-bottom-color: rgb(75 85 99);
    }

    .resize-handle:hover {
      background-color: rgb(30 58 138); /* bg-blue-900 */
    }

    .resize-handle:active {
      background-color: rgb(30 64 175); /* bg-blue-800 */
    }

    .resize-handle-indicator {
      background-color: rgb(156 163 175); /* bg-gray-400 */
    }

    .resize-handle:active .resize-handle-indicator {
      background-color: rgb(96 165 250); /* bg-blue-400 */
    }
  }
</style>
