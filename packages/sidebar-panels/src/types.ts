export interface PanelTab {
  id: string;
  label: string;
  icon?: string;
  badge?: number;
}

export interface TreeNode {
  id: string;
  label: string;
  icon?: string;
  expanded?: boolean;
  children?: TreeNode[];
  data?: any;
}

export type SidebarPosition = 'left' | 'right';
