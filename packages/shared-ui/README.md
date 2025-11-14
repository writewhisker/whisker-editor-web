# @whisker/shared-ui

Shared UI components and styles for the Whisker ecosystem.

## Installation

```bash
npm install @whisker/shared-ui svelte
```

## Usage

### Importing Styles

```typescript
// Import all base styles
import '@whisker/shared-ui/styles';
```

### Using Components

```svelte
<script>
  import { Button, LoadingSpinner, Modal, Toast } from '@whisker/shared-ui/components';

  let showModal = false;
  let notifications = [];
</script>

<Button variant="primary" onclick={() => showModal = true}>
  Open Modal
</Button>

<Modal bind:open={showModal} title="Example Modal">
  <p>Modal content here</p>
</Modal>

<LoadingSpinner message="Loading..." />

<Toast {notifications} onDismiss={(id) => console.log('Dismissed', id)} />
```

### Using Utilities

```typescript
import { classNames, portal } from '@whisker/shared-ui/utils';

const buttonClass = classNames(
  'base-class',
  condition && 'conditional-class',
  'another-class'
);
```

## Components

### Button
Versatile button component with multiple variants and sizes.

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
- `size`: 'small' | 'medium' | 'large'
- `disabled`: boolean
- `type`: 'button' | 'submit' | 'reset'

### LoadingSpinner
Loading indicator with customizable size and color.

**Props:**
- `message`: string
- `size`: 'small' | 'medium' | 'large'
- `color`: 'primary' | 'secondary' | 'success' | 'warning' | 'error'

### Modal
Accessible modal dialog with backdrop.

**Props:**
- `open`: boolean (bindable)
- `title`: string
- `size`: 'small' | 'medium' | 'large' | 'full'
- `onClose`: () => void

### Toast
Notification toast component.

**Props:**
- `notifications`: ToastItem[]
- `onDismiss`: (id: string) => void
- `position`: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

## Theming

The design system uses CSS custom properties for theming. You can customize the theme by overriding these variables:

```css
:root {
  --whisker-color-primary: #6366f1;
  --whisker-color-secondary: #8b5cf6;
  /* ... other variables */
}
```

### Dark Mode

Dark mode is automatically supported via `data-theme="dark"` attribute or `prefers-color-scheme`:

```html
<html data-theme="dark">
  <!-- Your app -->
</html>
```

## Design Tokens

- **Colors**: Primary, secondary, success, warning, error, neutral shades
- **Spacing**: xs, sm, md, lg, xl, 2xl, 3xl (based on 4px scale)
- **Typography**: Font families, sizes, weights, line heights
- **Border Radius**: sm, md, lg, xl, full
- **Shadows**: sm, md, lg, xl
- **Z-index**: Predefined layers for proper stacking

## License

AGPL-3.0
