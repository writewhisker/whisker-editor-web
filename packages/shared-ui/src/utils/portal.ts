/**
 * Portal utility for rendering components outside the DOM hierarchy
 */

export function portal(node: HTMLElement, target: string | HTMLElement = 'body') {
  let targetElement: HTMLElement;

  if (typeof target === 'string') {
    targetElement = document.querySelector(target) as HTMLElement;
    if (!targetElement) {
      throw new Error(`Target element "${target}" not found`);
    }
  } else {
    targetElement = target;
  }

  targetElement.appendChild(node);

  return {
    destroy() {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    },
  };
}
