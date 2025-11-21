export interface DialogButton {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  action: () => void | Promise<void>;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export interface AlertDialogOptions {
  title: string;
  message: string;
  okLabel?: string;
}

export interface PromptDialogOptions {
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}
