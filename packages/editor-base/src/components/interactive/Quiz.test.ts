import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import Quiz from './Quiz.svelte';
import type { QuizOption } from './Quiz.svelte';

describe('Quiz', () => {
  const mockOptions: QuizOption[] = [
    { id: 'opt1', text: 'Correct answer', isCorrect: true, feedback: 'Great job!' },
    { id: 'opt2', text: 'Wrong answer 1', isCorrect: false, feedback: 'Try again' },
    { id: 'opt3', text: 'Wrong answer 2', isCorrect: false },
  ];

  const mockMultipleOptions: QuizOption[] = [
    { id: 'opt1', text: 'Correct 1', isCorrect: true },
    { id: 'opt2', text: 'Correct 2', isCorrect: true },
    { id: 'opt3', text: 'Wrong', isCorrect: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render quiz with question', () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'What is the answer?',
          options: mockOptions,
          variableName: 'quiz1',
        },
      });

      expect(getByText('What is the answer?')).toBeTruthy();
    });

    it('should render all options', () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
        },
      });

      expect(getByText('Correct answer')).toBeTruthy();
      expect(getByText('Wrong answer 1')).toBeTruthy();
      expect(getByText('Wrong answer 2')).toBeTruthy();
    });

    it('should show single choice hint by default', () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
        },
      });

      expect(getByText('Select one answer')).toBeTruthy();
    });

    it('should show multiple choice hint when multipleChoice is true', () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
          multipleChoice: true,
        },
      });

      expect(getByText('Select all correct answers')).toBeTruthy();
    });

    it('should render submit button', () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
        },
      });

      expect(getByText('Submit Answer')).toBeTruthy();
    });

    it('should disable submit button when no option selected', () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
        },
      });

      const submitButton = getByText('Submit Answer') as HTMLButtonElement;
      expect(submitButton.disabled).toBe(true);
    });
  });

  describe('single choice mode', () => {
    it('should select option when clicked', async () => {
      const { getByText, container } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
        },
      });

      const option = getByText('Correct answer');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer') as HTMLButtonElement;
      expect(submitButton.disabled).toBe(false);
    });

    it('should deselect previous option when selecting new one', async () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
        },
      });

      const option1 = getByText('Correct answer');
      const option2 = getByText('Wrong answer 1');

      await fireEvent.click(option1);
      await fireEvent.click(option2);

      // Only one should be selected
      const submitButton = getByText('Submit Answer') as HTMLButtonElement;
      expect(submitButton.disabled).toBe(false);
    });

    it('should dispatch submit event with correct data on submit', async () => {
      const { getByText, component } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
        },
      });

      let submittedData: any = null;
      (component as any).$on('submit', (event) => {
        submittedData = event.detail;
      });

      const option = getByText('Correct answer');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      expect(submittedData).toBeTruthy();
      expect(submittedData.variableName).toBe('quiz1');
      expect(submittedData.isCorrect).toBe(true);
      expect(submittedData.selectedOptions).toContain('opt1');
    });

    it('should show success result when correct answer submitted', async () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
        },
      });

      const option = getByText('Correct answer');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(getByText('Correct!')).toBeTruthy();
      });
    });

    it('should show failure result when wrong answer submitted', async () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
        },
      });

      const option = getByText('Wrong answer 1');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(getByText('Not quite right')).toBeTruthy();
      });
    });
  });

  describe('multiple choice mode', () => {
    it('should allow selecting multiple options', async () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockMultipleOptions,
          variableName: 'quiz1',
          multipleChoice: true,
        },
      });

      const option1 = getByText('Correct 1');
      const option2 = getByText('Correct 2');

      await fireEvent.click(option1);
      await fireEvent.click(option2);

      const submitButton = getByText('Submit Answer') as HTMLButtonElement;
      expect(submitButton.disabled).toBe(false);
    });

    it('should allow deselecting options', async () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockMultipleOptions,
          variableName: 'quiz1',
          multipleChoice: true,
        },
      });

      const option = getByText('Correct 1');

      await fireEvent.click(option);
      await fireEvent.click(option); // Click again to deselect

      const submitButton = getByText('Submit Answer') as HTMLButtonElement;
      expect(submitButton.disabled).toBe(true);
    });

    it('should be correct only when all correct answers selected', async () => {
      const { getByText, component } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockMultipleOptions,
          variableName: 'quiz1',
          multipleChoice: true,
        },
      });

      let submittedData: any = null;
      (component as any).$on('submit', (event) => {
        submittedData = event.detail;
      });

      // Select only one correct answer
      const option1 = getByText('Correct 1');
      await fireEvent.click(option1);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      expect(submittedData.isCorrect).toBe(false);
    });

    it('should be correct when all and only correct answers selected', async () => {
      const { getByText, component } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockMultipleOptions,
          variableName: 'quiz1',
          multipleChoice: true,
        },
      });

      let submittedData: any = null;
      (component as any).$on('submit', (event) => {
        submittedData = event.detail;
      });

      // Select both correct answers
      const option1 = getByText('Correct 1');
      const option2 = getByText('Correct 2');
      await fireEvent.click(option1);
      await fireEvent.click(option2);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      expect(submittedData.isCorrect).toBe(true);
    });
  });

  describe('feedback display', () => {
    it('should show feedback for correct selected answer', async () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
          showFeedback: true,
        },
      });

      const option = getByText('Correct answer');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(getByText('Great job!')).toBeTruthy();
      });
    });

    it('should show feedback for incorrect selected answer', async () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
          showFeedback: true,
        },
      });

      const option = getByText('Wrong answer 1');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(getByText('Try again')).toBeTruthy();
      });
    });

    it('should not show feedback when showFeedback is false', async () => {
      const { getByText, queryByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
          showFeedback: false,
        },
      });

      const option = getByText('Correct answer');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(queryByText('Great job!')).toBeNull();
      });
    });
  });

  describe('retry functionality', () => {
    it('should show retry button when allowRetry is true and answer is wrong', async () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
          allowRetry: true,
        },
      });

      const option = getByText('Wrong answer 1');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(getByText('Try Again')).toBeTruthy();
      });
    });

    it('should not show retry button when answer is correct', async () => {
      const { getByText, queryByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
          allowRetry: true,
        },
      });

      const option = getByText('Correct answer');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(queryByText('Try Again')).toBeNull();
      });
    });

    it('should reset quiz when retry button clicked', async () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
          allowRetry: true,
        },
      });

      const option = getByText('Wrong answer 1');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(getByText('Try Again')).toBeTruthy();
      });

      const retryButton = getByText('Try Again');
      await fireEvent.click(retryButton);

      await waitFor(() => {
        expect(getByText('Submit Answer')).toBeTruthy();
      });
    });

    it('should dispatch retry event when retry clicked', async () => {
      const { getByText, component } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
          allowRetry: true,
        },
      });

      let retryData: any = null;
      (component as any).$on('retry', (event) => {
        retryData = event.detail;
      });

      const option = getByText('Wrong answer 1');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(getByText('Try Again')).toBeTruthy();
      });

      const retryButton = getByText('Try Again');
      await fireEvent.click(retryButton);

      expect(retryData).toBeTruthy();
      expect(retryData.variableName).toBe('quiz1');
    });

    it('should not allow selecting when allowRetry is false after submission', async () => {
      const { getByText, container } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
          allowRetry: false,
        },
      });

      const option1 = getByText('Wrong answer 1');
      await fireEvent.click(option1);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      await waitFor(() => {
        const optionButtons = container.querySelectorAll('.option-card');
        optionButtons.forEach((btn) => {
          expect((btn as HTMLButtonElement).disabled).toBe(true);
        });
      });
    });
  });

  describe('results panel', () => {
    it('should display correct count', async () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
        },
      });

      const option = getByText('Correct answer');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(getByText('1')).toBeTruthy(); // Correct count
        expect(getByText('Correct')).toBeTruthy();
      });
    });

    it('should display incorrect count', async () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
        },
      });

      const option = getByText('Wrong answer 1');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(getByText('1')).toBeTruthy(); // Incorrect count
        expect(getByText('Incorrect')).toBeTruthy();
      });
    });

    it('should display total correct count', async () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
        },
      });

      const option = getByText('Correct answer');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(getByText('Total Correct')).toBeTruthy();
      });
    });
  });

  describe('disabled state', () => {
    it('should disable all options when disabled prop is true', () => {
      const { container } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
          disabled: true,
        },
      });

      const buttons = container.querySelectorAll('.option-card');
      buttons.forEach((btn) => {
        expect((btn as HTMLButtonElement).disabled).toBe(true);
      });
    });

    it('should not allow selection when disabled', async () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
          disabled: true,
        },
      });

      const option = getByText('Correct answer');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer') as HTMLButtonElement;
      expect(submitButton.disabled).toBe(true);
    });
  });

  describe('visual feedback', () => {
    it('should apply selected class to selected option', async () => {
      const { getByText, container } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
        },
      });

      const option = getByText('Correct answer');
      await fireEvent.click(option);

      await waitFor(() => {
        const optionElement = option.closest('.option-card');
        expect(optionElement?.classList.contains('selected')).toBe(true);
      });
    });

    it('should apply correct class after submission for correct answer', async () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
        },
      });

      const option = getByText('Correct answer');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      await waitFor(() => {
        const optionElement = option.closest('.option-card');
        expect(optionElement?.classList.contains('correct')).toBe(true);
      });
    });

    it('should apply incorrect class after submission for wrong answer', async () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
        },
      });

      const option = getByText('Wrong answer 1');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      await waitFor(() => {
        const optionElement = option.closest('.option-card');
        expect(optionElement?.classList.contains('incorrect')).toBe(true);
      });
    });

    it('should show success styling in results panel when correct', async () => {
      const { getByText, container } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
        },
      });

      const option = getByText('Correct answer');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      await waitFor(() => {
        const resultsPanel = container.querySelector('.results-panel.success');
        expect(resultsPanel).toBeTruthy();
      });
    });

    it('should show failure styling in results panel when incorrect', async () => {
      const { getByText, container } = render(Quiz, {
        props: {
          question: 'Test question',
          options: mockOptions,
          variableName: 'quiz1',
        },
      });

      const option = getByText('Wrong answer 1');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      await waitFor(() => {
        const resultsPanel = container.querySelector('.results-panel.failure');
        expect(resultsPanel).toBeTruthy();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty options array', () => {
      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: [],
          variableName: 'quiz1',
        },
      });

      expect(getByText('Test question')).toBeTruthy();
      expect(getByText('Submit Answer')).toBeTruthy();
    });

    it('should handle options without feedback', async () => {
      const optionsNoFeedback: QuizOption[] = [
        { id: 'opt1', text: 'Option 1', isCorrect: true },
        { id: 'opt2', text: 'Option 2', isCorrect: false },
      ];

      const { getByText } = render(Quiz, {
        props: {
          question: 'Test question',
          options: optionsNoFeedback,
          variableName: 'quiz1',
          showFeedback: true,
        },
      });

      const option = getByText('Option 1');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      // Should not crash even though feedback is undefined
      await waitFor(() => {
        expect(getByText('Correct!')).toBeTruthy();
      });
    });

    it('should handle all incorrect options', async () => {
      const allWrong: QuizOption[] = [
        { id: 'opt1', text: 'Wrong 1', isCorrect: false },
        { id: 'opt2', text: 'Wrong 2', isCorrect: false },
      ];

      const { getByText, component } = render(Quiz, {
        props: {
          question: 'Test question',
          options: allWrong,
          variableName: 'quiz1',
        },
      });

      let submittedData: any = null;
      (component as any).$on('submit', (event) => {
        submittedData = event.detail;
      });

      const option = getByText('Wrong 1');
      await fireEvent.click(option);

      const submitButton = getByText('Submit Answer');
      await fireEvent.click(submitButton);

      expect(submittedData.isCorrect).toBe(false);
      expect(submittedData.correctCount).toBe(0);
    });
  });
});
