import { SvelteComponent } from 'svelte';

export interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'white';
}

export default class LoadingSpinner extends SvelteComponent<LoadingSpinnerProps> {}
