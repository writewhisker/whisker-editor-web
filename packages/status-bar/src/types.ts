export interface StatusItem {
  id: string;
  text?: string;
  icon?: string;
  tooltip?: string;
  priority?: number;
  position?: 'left' | 'right';
  onClick?: () => void;
}

export type StatusType = 'info' | 'success' | 'warning' | 'error';

export interface StatusMessage {
  text: string;
  type?: StatusType;
  duration?: number;
}

export interface ProgressInfo {
  percentage: number;
  message?: string;
}
