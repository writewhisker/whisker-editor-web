export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  divider?: boolean;
  children?: ContextMenuItem[];
  action?: () => void | Promise<void>;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}
