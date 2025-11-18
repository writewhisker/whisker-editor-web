import { SvelteComponent } from 'svelte';

export interface ToastItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface ToastProps {
  notifications?: ToastItem[];
  onDismiss?: (id: string) => void;
}

export default class Toast extends SvelteComponent<ToastProps> {}
