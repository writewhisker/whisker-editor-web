declare module 'svelte-virtual-list' {
  import { SvelteComponentTyped } from 'svelte';

  export interface VirtualListProps<T = any> {
    items: T[];
    height?: string | number;
    itemHeight?: number;
  }

  export default class VirtualList<T = any> extends SvelteComponentTyped<
    VirtualListProps<T>,
    {},
    { default: { item: T; index: number } }
  > {}
}
