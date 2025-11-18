import { SvelteComponent } from 'svelte';

export interface ModalProps {
  open?: boolean;
  title?: string;
  size?: 'small' | 'medium' | 'large';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  onclose?: () => void;
  children?: import('svelte').Snippet;
  footer?: import('svelte').Snippet;
}

export default class Modal extends SvelteComponent<ModalProps> {}
