import { SvelteComponent } from 'svelte';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onclick?: (event: MouseEvent) => void;
  children?: import('svelte').Snippet;
}

export default class Button extends SvelteComponent<ButtonProps> {}
