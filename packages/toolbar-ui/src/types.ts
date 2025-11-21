export interface ToolbarItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  tooltip?: string;
  action?: () => void;
}

export interface ToolbarGroup {
  id: string;
  items: ToolbarItem[];
}

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  shortcut?: string;
  action?: () => void;
  children?: MenuItem[];
}

export interface Command {
  id: string;
  label: string;
  category?: string;
  shortcut?: string;
  action: () => void;
}
