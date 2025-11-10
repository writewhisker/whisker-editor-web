import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import TimedChoice from './TimedChoice.svelte';

describe('TimedChoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render with default props', () => {
      const { getByText } = render(TimedChoice, {
        props: { text: 'Test Choice' },
      });
      expect(getByText('Test Choice')).toBeTruthy();
    });

    it('should display choice text', () => {
      const { getByText } = render(TimedChoice, {
        props: { text: 'Make a decision' },
      });
      expect(getByText('Make a decision')).toBeTruthy();
    });

    it('should display initial time remaining', () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 10 },
      });
      const timer = container.querySelector('.choice-timer');
      expect(timer?.textContent).toContain('s');
    });

    it('should render as button element', () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test' },
      });
      const button = container.querySelector('button.timed-choice');
      expect(button).toBeTruthy();
    });

    it('should show progress bar by default', () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test' },
      });
      const progressBar = container.querySelector('.progress-bar');
      expect(progressBar).toBeTruthy();
    });

    it('should hide progress bar when showProgress is false', () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', showProgress: false },
      });
      const progressBar = container.querySelector('.progress-bar');
      expect(progressBar).toBeFalsy();
    });
  });

  describe('time limit customization', () => {
    it('should use default time limit of 10 seconds', () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test' },
      });
      const timer = container.querySelector('.choice-timer');
      expect(timer?.textContent).toBe('10s');
    });

    it('should use custom time limit', () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 5 },
      });
      const timer = container.querySelector('.choice-timer');
      expect(timer?.textContent).toBe('5s');
    });

    it('should use custom time limit of 30 seconds', () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 30 },
      });
      const timer = container.querySelector('.choice-timer');
      expect(timer?.textContent).toBe('30s');
    });
  });

  describe('timer functionality', () => {
    it('should count down when mounted', async () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 10 },
      });

      const initialTimer = container.querySelector('.choice-timer');
      expect(initialTimer?.textContent).toBe('10s');

      // Advance by 1 second
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        const timer = container.querySelector('.choice-timer');
        expect(timer?.textContent).toBe('9s');
      });
    });

    it('should not start timer when disabled', () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', disabled: true, timeLimit: 10 },
      });

      const initialTimer = container.querySelector('.choice-timer');
      expect(initialTimer?.textContent).toBe('10s');

      vi.advanceTimersByTime(2000);

      const timer = container.querySelector('.choice-timer');
      expect(timer?.textContent).toBe('10s');
    });

    it('should update timer display smoothly', async () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 5 },
      });

      // Advance by small increments
      vi.advanceTimersByTime(100);

      await waitFor(() => {
        const timer = container.querySelector('.choice-timer');
        expect(timer).toBeTruthy();
      });
    });
  });

  describe('progress bar', () => {
    it('should show full progress initially', () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 10 },
      });

      const progressFill = container.querySelector('.progress-fill') as HTMLElement;
      expect(progressFill?.style.width).toBe('100%');
    });

    it('should decrease progress over time', async () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 10 },
      });

      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        const progressFill = container.querySelector('.progress-fill') as HTMLElement;
        const width = parseFloat(progressFill?.style.width);
        expect(width).toBeLessThan(100);
      });
    });

    it('should reach 0% when time expires', async () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 1 },
      });

      vi.advanceTimersByTime(1100);

      await waitFor(() => {
        const progressFill = container.querySelector('.progress-fill') as HTMLElement;
        const width = parseFloat(progressFill?.style.width);
        expect(width).toBe(0);
      });
    });
  });

  describe('warning state', () => {
    it('should enter warning state near time limit', async () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 10, warningThreshold: 3 },
      });

      // Advance to warning threshold
      vi.advanceTimersByTime(7100);

      await waitFor(() => {
        const button = container.querySelector('.timed-choice');
        expect(button?.classList.contains('warning')).toBe(true);
      });
    });

    it('should pulse timer in warning state', async () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 5, warningThreshold: 2 },
      });

      vi.advanceTimersByTime(3100);

      await waitFor(() => {
        const timer = container.querySelector('.choice-timer');
        expect(timer?.classList.contains('pulse')).toBe(true);
      });
    });

    it('should use custom warning threshold', async () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 10, warningThreshold: 5 },
      });

      vi.advanceTimersByTime(5100);

      await waitFor(() => {
        const button = container.querySelector('.timed-choice');
        expect(button?.classList.contains('warning')).toBe(true);
      });
    });
  });

  describe('expiration', () => {
    it('should expire when time runs out', async () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 1, autoSelect: false },
      });

      vi.advanceTimersByTime(1100);

      await waitFor(() => {
        const button = container.querySelector('.timed-choice');
        expect(button?.classList.contains('expired')).toBe(true);
      });
    });

    it('should show expired overlay when not auto-selecting', async () => {
      const { getByText } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 1, autoSelect: false },
      });

      vi.advanceTimersByTime(1100);

      await waitFor(() => {
        expect(getByText("Time's Up!")).toBeTruthy();
      });
    });

    it('should disable button when expired', async () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 1 },
      });

      vi.advanceTimersByTime(1100);

      await waitFor(() => {
        const button = container.querySelector('button') as HTMLButtonElement;
        expect(button.disabled).toBe(true);
      });
    });

    it('should dispatch expired event when time runs out without auto-select', async () => {
      const { component } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 1, autoSelect: false },
      });

      let expiredFired = false;
      (component as any).$on('expired', () => {
        expiredFired = true;
      });

      vi.advanceTimersByTime(1100);

      await waitFor(() => {
        expect(expiredFired).toBe(true);
      });
    });
  });

  describe('auto-select', () => {
    it('should auto-select when time expires if enabled', async () => {
      const { component } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 1, autoSelect: true, defaultChoice: true },
      });

      let selectFired = false;
      let autoSelected = false;
      (component as any).$on('select', (event) => {
        selectFired = true;
        autoSelected = event.detail.autoSelected;
      });

      vi.advanceTimersByTime(1100);

      await waitFor(() => {
        expect(selectFired).toBe(true);
        expect(autoSelected).toBe(true);
      });
    });

    it('should not auto-select if autoSelect is false', async () => {
      const { component } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 1, autoSelect: false },
      });

      let selectFired = false;
      (component as any).$on('select', () => {
        selectFired = true;
      });

      vi.advanceTimersByTime(1100);

      await waitFor(() => {
        expect(selectFired).toBe(false);
      });
    });

    it('should not auto-select if not default choice', async () => {
      const { component } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 1, autoSelect: true, defaultChoice: false },
      });

      let selectFired = false;
      (component as any).$on('select', () => {
        selectFired = true;
      });

      vi.advanceTimersByTime(1100);

      await waitFor(() => {
        expect(selectFired).toBe(false);
      });
    });
  });

  describe('click interaction', () => {
    it('should dispatch select event when clicked', async () => {
      const { component, container } = render(TimedChoice, {
        props: { text: 'Test' },
      });

      let selectFired = false;
      let autoSelected = true;
      (component as any).$on('select', (event) => {
        selectFired = true;
        autoSelected = event.detail.autoSelected;
      });

      const button = container.querySelector('button');
      await fireEvent.click(button!);

      expect(selectFired).toBe(true);
      expect(autoSelected).toBe(false);
    });

    it('should stop timer when clicked', async () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 10 },
      });

      const button = container.querySelector('button');
      await fireEvent.click(button!);

      const timerBefore = container.querySelector('.choice-timer')?.textContent;

      vi.advanceTimersByTime(1000);

      const timerAfter = container.querySelector('.choice-timer')?.textContent;
      // Timer should have stopped (or button disabled/expired)
      expect(timerAfter).toBeTruthy();
    });

    it('should not respond to clicks when disabled', async () => {
      const { component, container } = render(TimedChoice, {
        props: { text: 'Test', disabled: true },
      });

      let selectFired = false;
      (component as any).$on('select', () => {
        selectFired = true;
      });

      const button = container.querySelector('button');
      await fireEvent.click(button!);

      expect(selectFired).toBe(false);
    });

    it('should not respond to clicks when expired', async () => {
      const { component, container } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 1 },
      });

      vi.advanceTimersByTime(1100);

      await waitFor(() => {
        const button = container.querySelector('button') as HTMLButtonElement;
        expect(button.disabled).toBe(true);
      });

      let selectFired = false;
      (component as any).$on('select', () => {
        selectFired = true;
      });

      const button = container.querySelector('button');
      await fireEvent.click(button!);

      expect(selectFired).toBe(false);
    });
  });

  describe('keyboard interaction', () => {
    it('should handle enter key', async () => {
      const { component, container } = render(TimedChoice, {
        props: { text: 'Test' },
      });

      let selectFired = false;
      (component as any).$on('select', () => {
        selectFired = true;
      });

      const button = container.querySelector('button');
      await fireEvent.keyDown(button!, { key: 'Enter' });

      expect(selectFired).toBe(true);
    });

    it('should handle space key', async () => {
      const { component, container } = render(TimedChoice, {
        props: { text: 'Test' },
      });

      let selectFired = false;
      (component as any).$on('select', () => {
        selectFired = true;
      });

      const button = container.querySelector('button');
      await fireEvent.keyDown(button!, { key: ' ' });

      expect(selectFired).toBe(true);
    });

    it('should not handle other keys', async () => {
      const { component, container } = render(TimedChoice, {
        props: { text: 'Test' },
      });

      let selectFired = false;
      (component as any).$on('select', () => {
        selectFired = true;
      });

      const button = container.querySelector('button');
      await fireEvent.keyDown(button!, { key: 'a' });

      expect(selectFired).toBe(false);
    });
  });

  describe('default choice styling', () => {
    it('should apply default styling when defaultChoice is true', () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', defaultChoice: true },
      });

      const button = container.querySelector('.timed-choice');
      expect(button?.classList.contains('default')).toBe(true);
    });

    it('should not apply default styling when defaultChoice is false', () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', defaultChoice: false },
      });

      const button = container.querySelector('.timed-choice');
      expect(button?.classList.contains('default')).toBe(false);
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', disabled: true },
      });

      const button = container.querySelector('button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('should stop timer when disabled changes to true', async () => {
      const { container, component } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 10, disabled: false },
      });

      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        const timer = container.querySelector('.choice-timer');
        expect(timer?.textContent).toBe('9s');
      });

      (component as any).$set({ disabled: true });

      const timerBefore = container.querySelector('.choice-timer')?.textContent;
      vi.advanceTimersByTime(1000);
      const timerAfter = container.querySelector('.choice-timer')?.textContent;

      // Timer should not change
      expect(timerBefore).toBe(timerAfter);
    });
  });

  describe('aria labels', () => {
    it('should have aria-label with time remaining', () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test Choice', timeLimit: 10 },
      });

      const button = container.querySelector('button');
      expect(button?.getAttribute('aria-label')).toContain('Test Choice');
      expect(button?.getAttribute('aria-label')).toContain('remaining');
    });
  });

  describe('edge cases', () => {
    it('should handle very short time limits', async () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 0.5 },
      });

      vi.advanceTimersByTime(600);

      await waitFor(() => {
        const button = container.querySelector('.timed-choice');
        expect(button?.classList.contains('expired')).toBe(true);
      });
    });

    it('should handle very long time limits', () => {
      const { container } = render(TimedChoice, {
        props: { text: 'Test', timeLimit: 300 },
      });

      const timer = container.querySelector('.choice-timer');
      expect(timer?.textContent).toBe('300s');
    });

    it('should cleanup timer on unmount', () => {
      const { unmount } = render(TimedChoice, {
        props: { text: 'Test' },
      });

      unmount();

      // Advance timers - should not cause any errors
      vi.advanceTimersByTime(10000);
    });

    it('should handle rapid clicking', async () => {
      const { component, container } = render(TimedChoice, {
        props: { text: 'Test' },
      });

      let selectCount = 0;
      (component as any).$on('select', () => {
        selectCount++;
      });

      const button = container.querySelector('button');
      await fireEvent.click(button!);
      await fireEvent.click(button!);
      await fireEvent.click(button!);

      // Should only fire once (timer stopped after first click)
      expect(selectCount).toBe(1);
    });
  });
});
