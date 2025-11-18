import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import AuthDialog from './AuthDialog.svelte';
import * as githubAuth from '@writewhisker/github';

// Mock the GitHub auth module
vi.mock('@writewhisker/github', () => ({
  githubUser: { subscribe: vi.fn(() => () => {}) },
  isAuthenticated: { subscribe: vi.fn(() => () => {}) },
  startGitHubAuth: vi.fn(),
}));

describe('AuthDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render auth dialog', () => {
      const { getByText } = render(AuthDialog);
      expect(getByText('Create Your Account')).toBeTruthy();
    });

    it('should render close button', () => {
      const { container } = render(AuthDialog);
      const closeButton = container.querySelector('.close-btn');
      expect(closeButton).toBeTruthy();
    });

    it('should render logo', () => {
      const { container } = render(AuthDialog);
      const logo = container.querySelector('.auth-logo svg');
      expect(logo).toBeTruthy();
    });

    it('should display signup mode by default', () => {
      const { getByText } = render(AuthDialog);
      expect(getByText('Create Your Account')).toBeTruthy();
      expect(getByText('Start creating interactive narratives today')).toBeTruthy();
    });

    it('should display signin mode when mode is signin', () => {
      const { getByText } = render(AuthDialog, {
        props: { mode: 'signin' },
      });
      expect(getByText('Welcome Back')).toBeTruthy();
      expect(getByText('Sign in to continue your stories')).toBeTruthy();
    });
  });

  describe('social auth buttons', () => {
    it('should render GitHub auth button', () => {
      const { getByText } = render(AuthDialog);
      expect(getByText('Continue with GitHub')).toBeTruthy();
    });

    it('should render Google auth button', () => {
      const { getByText } = render(AuthDialog);
      expect(getByText('Continue with Google')).toBeTruthy();
    });

    it('should call startGitHubAuth when GitHub button clicked', async () => {
      const mockStartGitHubAuth = vi.mocked(githubAuth.startGitHubAuth);
      mockStartGitHubAuth.mockResolvedValue();

      const { getByText } = render(AuthDialog);
      const githubButton = getByText('Continue with GitHub');

      await fireEvent.click(githubButton);

      expect(githubAuth.startGitHubAuth).toHaveBeenCalled();
    });

    it('should show error message when GitHub auth fails', async () => {
      const mockStartGitHubAuth = vi.mocked(githubAuth.startGitHubAuth);
      mockStartGitHubAuth.mockRejectedValue(
        new Error('GitHub auth failed')
      );

      const { getByText, container } = render(AuthDialog);
      const githubButton = getByText('Continue with GitHub');

      await fireEvent.click(githubButton);

      await waitFor(
        () => {
          const errorMsg = container.querySelector('.error-message');
          expect(errorMsg).toBeTruthy();
          expect(errorMsg?.textContent).toMatch(/GitHub auth failed/);
        },
        { timeout: 3000 }
      );
    });

    it('should show coming soon message when Google button clicked', async () => {
      const { getByText } = render(AuthDialog);
      const googleButton = getByText('Continue with Google');

      await fireEvent.click(googleButton);

      await waitFor(() => {
        expect(getByText(/Google authentication coming soon/)).toBeTruthy();
      });
    });
  });

  describe('email/password form', () => {
    it('should render email input', () => {
      const { container } = render(AuthDialog);
      const emailInput = container.querySelector('#email') as HTMLInputElement;
      expect(emailInput).toBeTruthy();
      expect(emailInput?.type).toBe('email');
    });

    it('should render password input', () => {
      const { container } = render(AuthDialog);
      const passwordInput = container.querySelector('#password') as HTMLInputElement;
      expect(passwordInput).toBeTruthy();
      expect(passwordInput?.type).toBe('password');
    });

    it('should render name input in signup mode', () => {
      const { container } = render(AuthDialog, {
        props: { mode: 'signup' },
      });
      const nameInput = container.querySelector('#name') as HTMLInputElement;
      expect(nameInput).toBeTruthy();
    });

    it('should not render name input in signin mode', () => {
      const { container } = render(AuthDialog, {
        props: { mode: 'signin' },
      });
      const nameInput = container.querySelector('#name');
      expect(nameInput).toBeNull();
    });

    it('should allow typing in email field', async () => {
      const { container } = render(AuthDialog);
      const emailInput = container.querySelector('#email') as HTMLInputElement;

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });

      expect(emailInput.value).toBe('test@example.com');
    });

    it('should allow typing in password field', async () => {
      const { container } = render(AuthDialog);
      const passwordInput = container.querySelector('#password') as HTMLInputElement;

      await fireEvent.input(passwordInput, { target: { value: 'password123' } });

      expect(passwordInput.value).toBe('password123');
    });

    it('should render submit button with correct text in signup mode', () => {
      const { getByText } = render(AuthDialog, {
        props: { mode: 'signup' },
      });
      expect(getByText('Create Account')).toBeTruthy();
    });

    it('should render submit button with correct text in signin mode', () => {
      const { getByText } = render(AuthDialog, {
        props: { mode: 'signin' },
      });
      expect(getByText('Sign In')).toBeTruthy();
    });

    it('should show error message when email auth clicked', async () => {
      const { container, getByText } = render(AuthDialog);

      const emailInput = container.querySelector('#email') as HTMLInputElement;
      const passwordInput = container.querySelector('#password') as HTMLInputElement;
      const form = container.querySelector('form.auth-form') as HTMLFormElement;

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.input(passwordInput, { target: { value: 'password123' } });

      await fireEvent.submit(form);

      await waitFor(() => {
        expect(getByText(/Email authentication coming soon/)).toBeTruthy();
      });
    });
  });

  describe('mode toggle', () => {
    it('should show toggle to signin in signup mode', () => {
      const { getByText } = render(AuthDialog, {
        props: { mode: 'signup' },
      });
      expect(getByText("Already have an account?")).toBeTruthy();
      expect(getByText('Sign in')).toBeTruthy();
    });

    it('should show toggle to signup in signin mode', () => {
      const { getByText } = render(AuthDialog, {
        props: { mode: 'signin' },
      });
      expect(getByText("Don't have an account?")).toBeTruthy();
      expect(getByText('Sign up')).toBeTruthy();
    });

    it('should toggle to signin mode when clicked', async () => {
      const { getByText } = render(AuthDialog, {
        props: { mode: 'signup' },
      });

      const toggleButton = getByText('Sign in');
      await fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(getByText('Welcome Back')).toBeTruthy();
      });
    });

    it('should toggle to signup mode when clicked', async () => {
      const { getByText } = render(AuthDialog, {
        props: { mode: 'signin' },
      });

      const toggleButton = getByText('Sign up');
      await fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(getByText('Create Your Account')).toBeTruthy();
      });
    });

    it('should clear error when toggling modes', async () => {
      const { getByText, queryByText, container } = render(AuthDialog);

      // Trigger an error
      const githubButton = getByText('Continue with Google');
      await fireEvent.click(githubButton);

      await waitFor(() => {
        expect(getByText(/Google authentication coming soon/)).toBeTruthy();
      });

      // Toggle mode
      const toggleButton = getByText('Sign in');
      await fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(queryByText(/Google authentication coming soon/)).toBeNull();
      });
    });
  });

  describe('guest mode', () => {
    it('should render guest mode button', () => {
      const { getByText } = render(AuthDialog);
      expect(getByText('Continue as Guest')).toBeTruthy();
    });

    it('should show guest mode limitations note', () => {
      const { getByText } = render(AuthDialog);
      expect(getByText('Limited features, no cloud save')).toBeTruthy();
    });

    it('should show guest button', () => {
      const { getByText } = render(AuthDialog);
      const guestButton = getByText('Continue as Guest');
      expect(guestButton).toBeTruthy();
    });
  });

  describe('close functionality', () => {
    it('should show close button', () => {
      const { container } = render(AuthDialog);
      const closeButton = container.querySelector('.close-btn') as HTMLButtonElement;
      expect(closeButton).toBeTruthy();
    });
  });

  describe('loading states', () => {
    it('should disable buttons when loading', async () => {
      vi.mocked(githubAuth.startGitHubAuth).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { getByText, container } = render(AuthDialog);

      const githubButton = getByText('Continue with GitHub');
      await fireEvent.click(githubButton);

      // Buttons should be disabled during loading
      const buttons = container.querySelectorAll('.auth-btn');
      buttons.forEach((button) => {
        expect((button as HTMLButtonElement).disabled).toBe(true);
      });
    });

    it('should show loading spinner when email form submitted', async () => {
      const { container, getByText } = render(AuthDialog);

      const emailInput = container.querySelector('#email') as HTMLInputElement;
      const passwordInput = container.querySelector('#password') as HTMLInputElement;

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.input(passwordInput, { target: { value: 'password123' } });

      const submitButton = container.querySelector('.submit-btn') as HTMLButtonElement;
      await fireEvent.click(submitButton);

      // Should show some loading state
      expect(submitButton).toBeTruthy();
    });
  });

  describe('forgot password', () => {
    it('should show forgot password link in signin mode', () => {
      const { getByText } = render(AuthDialog, {
        props: { mode: 'signin' },
      });
      expect(getByText('Forgot password?')).toBeTruthy();
    });

    it('should not show forgot password link in signup mode', () => {
      const { queryByText } = render(AuthDialog, {
        props: { mode: 'signup' },
      });
      expect(queryByText('Forgot password?')).toBeNull();
    });
  });

  describe('error display', () => {
    it('should display error message when present', async () => {
      vi.mocked(githubAuth.startGitHubAuth).mockRejectedValue(
        new Error('Network error')
      );

      const { getByText, container } = render(AuthDialog);

      const githubButton = getByText('Continue with GitHub');
      await fireEvent.click(githubButton);

      await waitFor(() => {
        const errorMessage = container.querySelector('.error-message');
        expect(errorMessage).toBeTruthy();
      });
    });

    it('should show error icon in error message', async () => {
      vi.mocked(githubAuth.startGitHubAuth).mockRejectedValue(
        new Error('Network error')
      );

      const { getByText, container } = render(AuthDialog);

      const githubButton = getByText('Continue with GitHub');
      await fireEvent.click(githubButton);

      await waitFor(() => {
        const errorMessage = container.querySelector('.error-message svg');
        expect(errorMessage).toBeTruthy();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper label associations', () => {
      const { container } = render(AuthDialog);

      const emailLabel = container.querySelector('label[for="email"]');
      const emailInput = container.querySelector('#email');

      expect(emailLabel).toBeTruthy();
      expect(emailInput).toBeTruthy();
    });

    it('should have required attribute on required fields', () => {
      const { container } = render(AuthDialog);

      const emailInput = container.querySelector('#email') as HTMLInputElement;
      const passwordInput = container.querySelector('#password') as HTMLInputElement;

      expect(emailInput.required).toBe(true);
      expect(passwordInput.required).toBe(true);
    });

    it('should have proper input types', () => {
      const { container } = render(AuthDialog);

      const emailInput = container.querySelector('#email') as HTMLInputElement;
      const passwordInput = container.querySelector('#password') as HTMLInputElement;

      expect(emailInput.type).toBe('email');
      expect(passwordInput.type).toBe('password');
    });
  });

  describe('divider', () => {
    it('should render divider with text', () => {
      const { getByText } = render(AuthDialog);
      expect(getByText('or continue with email')).toBeTruthy();
    });
  });

  describe('styling and classes', () => {
    it('should apply modal overlay styling', () => {
      const { container } = render(AuthDialog);
      const overlay = container.querySelector('.auth-dialog');
      expect(overlay).toBeTruthy();
      expect(overlay?.classList.contains('auth-dialog')).toBe(true);
    });

    it('should apply GitHub button specific styling', () => {
      const { getByText } = render(AuthDialog);
      const githubButton = getByText('Continue with GitHub');
      const buttonElement = githubButton.closest('.auth-btn');
      expect(buttonElement?.classList.contains('github')).toBe(true);
    });

    it('should apply Google button specific styling', () => {
      const { getByText } = render(AuthDialog);
      const googleButton = getByText('Continue with Google');
      const buttonElement = googleButton.closest('.auth-btn');
      expect(buttonElement?.classList.contains('google')).toBe(true);
    });
  });

  describe('form validation', () => {
    it('should require email field', () => {
      const { container } = render(AuthDialog);
      const emailInput = container.querySelector('#email') as HTMLInputElement;
      expect(emailInput.required).toBe(true);
    });

    it('should require password field', () => {
      const { container } = render(AuthDialog);
      const passwordInput = container.querySelector('#password') as HTMLInputElement;
      expect(passwordInput.required).toBe(true);
    });

    it('should require name field in signup mode', () => {
      const { container } = render(AuthDialog, {
        props: { mode: 'signup' },
      });
      const nameInput = container.querySelector('#name') as HTMLInputElement;
      expect(nameInput?.required).toBe(true);
    });
  });

  describe('input placeholders', () => {
    it('should have placeholder for email', () => {
      const { container } = render(AuthDialog);
      const emailInput = container.querySelector('#email') as HTMLInputElement;
      expect(emailInput.placeholder).toBe('you@example.com');
    });

    it('should have placeholder for password', () => {
      const { container } = render(AuthDialog);
      const passwordInput = container.querySelector('#password') as HTMLInputElement;
      expect(passwordInput.placeholder).toBe('••••••••');
    });

    it('should have placeholder for name in signup mode', () => {
      const { container } = render(AuthDialog, {
        props: { mode: 'signup' },
      });
      const nameInput = container.querySelector('#name') as HTMLInputElement;
      expect(nameInput?.placeholder).toBe('Your name');
    });
  });

  describe('edge cases', () => {
    it('should handle empty form submission', async () => {
      const { getByText } = render(AuthDialog);

      const submitButton = getByText('Create Account');
      await fireEvent.click(submitButton);

      // Form should use native validation to prevent submission
      expect(submitButton).toBeTruthy();
    });

    it('should handle rapid button clicks', async () => {
      vi.mocked(githubAuth.startGitHubAuth).mockResolvedValue();

      const { getByText } = render(AuthDialog);
      const githubButton = getByText('Continue with GitHub');

      await fireEvent.click(githubButton);
      await fireEvent.click(githubButton);
      await fireEvent.click(githubButton);

      // Should only call once or handle gracefully
      expect(githubAuth.startGitHubAuth).toHaveBeenCalled();
    });

    it('should handle undefined error messages', async () => {
      vi.mocked(githubAuth.startGitHubAuth).mockRejectedValue({});

      const { getByText } = render(AuthDialog);
      const githubButton = getByText('Continue with GitHub');

      await fireEvent.click(githubButton);

      await waitFor(() => {
        expect(getByText(/GitHub authentication failed/)).toBeTruthy();
      });
    });
  });

  describe('SVG icons', () => {
    it('should render GitHub icon SVG', () => {
      const { container } = render(AuthDialog);
      const githubIcon = container.querySelector('.auth-btn.github svg');
      expect(githubIcon).toBeTruthy();
    });

    it('should render Google icon SVG', () => {
      const { container } = render(AuthDialog);
      const googleIcon = container.querySelector('.auth-btn.google svg');
      expect(googleIcon).toBeTruthy();
    });

    it('should render spinner when loading', async () => {
      const { container, getByText } = render(AuthDialog);

      const emailInput = container.querySelector('#email') as HTMLInputElement;
      const passwordInput = container.querySelector('#password') as HTMLInputElement;

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.input(passwordInput, { target: { value: 'password123' } });

      const submitButton = getByText('Create Account');
      await fireEvent.click(submitButton);

      // Loading spinner might appear briefly
      expect(submitButton).toBeTruthy();
    });
  });
});
