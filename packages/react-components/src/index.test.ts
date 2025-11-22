/**
 * React Components Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { StoryPlayer } from './StoryPlayer.js';
import { PassageEditor } from './PassageEditor.js';
import { useStory } from './hooks.js';
import type { Story, Passage } from '@writewhisker/story-models';

describe('StoryPlayer', () => {
  let mockStory: Story;

  beforeEach(() => {
    mockStory = {
      id: 'story-1',
      name: 'Test Story',
      author: 'Test Author',
      startPassage: 'Start',
      passages: [
        {
          id: 'passage-1',
          title: 'Start',
          content: 'Welcome to the story! [[Continue]]',
          position: { x: 0, y: 0 }
        },
        {
          id: 'passage-2',
          title: 'Continue',
          content: 'This is the next passage. [[Go back|Start]]',
          position: { x: 100, y: 0 }
        },
        {
          id: 'passage-3',
          title: 'Dead End',
          content: 'No links here.',
          position: { x: 200, y: 0 }
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  it('should render the start passage', () => {
    render(<StoryPlayer story={mockStory} />);
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText(/Welcome to the story!/)).toBeInTheDocument();
  });

  it('should render passage not found for missing passage', () => {
    const storyWithBadStart = { ...mockStory, startPassage: 'NonExistent' };
    render(<StoryPlayer story={storyWithBadStart} />);
    expect(screen.getByText(/Passage not found: NonExistent/)).toBeInTheDocument();
  });

  it('should render links from passage content', () => {
    render(<StoryPlayer story={mockStory} />);
    const link = screen.getByRole('button', { name: 'Continue' });
    expect(link).toBeInTheDocument();
  });

  it('should navigate when link is clicked', () => {
    render(<StoryPlayer story={mockStory} />);
    const link = screen.getByRole('button', { name: 'Continue' });
    fireEvent.click(link);
    expect(screen.getByText('Continue')).toBeInTheDocument();
    expect(screen.getByText(/This is the next passage/)).toBeInTheDocument();
  });

  it('should handle links with custom text', () => {
    render(<StoryPlayer story={mockStory} />);
    const continueLink = screen.getByRole('button', { name: 'Continue' });
    fireEvent.click(continueLink);
    const backLink = screen.getByRole('button', { name: 'Go back' });
    expect(backLink).toBeInTheDocument();
    fireEvent.click(backLink);
    expect(screen.getByText(/Welcome to the story!/)).toBeInTheDocument();
  });

  it('should call onNavigate callback', () => {
    const onNavigate = vi.fn();
    render(<StoryPlayer story={mockStory} onNavigate={onNavigate} />);
    const link = screen.getByRole('button', { name: 'Continue' });
    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledWith('Continue');
  });

  it('should apply custom className', () => {
    const { container } = render(<StoryPlayer story={mockStory} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should apply custom style', () => {
    const { container } = render(<StoryPlayer story={mockStory} style={{ backgroundColor: 'red' }} />);
    expect(container.firstChild).toHaveStyle({ backgroundColor: 'red' });
  });

  it('should render passage without links', () => {
    const storyWithDeadEnd = { ...mockStory, startPassage: 'Dead End' };
    render(<StoryPlayer story={storyWithDeadEnd} />);
    expect(screen.getByText('Dead End')).toBeInTheDocument();
    expect(screen.getByText('No links here.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should handle multiple links in content', () => {
    const multiLinkStory: Story = {
      ...mockStory,
      passages: [
        {
          id: 'multi',
          title: 'Multi',
          content: 'Choose: [[Option A]] or [[Option B]] or [[Option C]]',
          position: { x: 0, y: 0 }
        }
      ],
      startPassage: 'Multi'
    };
    render(<StoryPlayer story={multiLinkStory} />);
    expect(screen.getByRole('button', { name: 'Option A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Option B' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Option C' })).toBeInTheDocument();
  });

  it('should preserve text formatting with links', () => {
    const { container } = render(<StoryPlayer story={mockStory} />);
    const content = container.querySelector('div[style*="white-space: pre-wrap"]');
    expect(content).toBeInTheDocument();
  });

  it('should handle hover styles on links', () => {
    render(<StoryPlayer story={mockStory} />);
    const link = screen.getByRole('button', { name: 'Continue' });
    expect(link).toHaveStyle({ background: '#3498db' });
    fireEvent.mouseEnter(link);
    expect(link).toHaveStyle({ background: '#2980b9' });
    fireEvent.mouseLeave(link);
    expect(link).toHaveStyle({ background: '#3498db' });
  });
});

describe('PassageEditor', () => {
  let mockPassage: Passage;

  beforeEach(() => {
    mockPassage = {
      id: 'passage-1',
      title: 'Test Passage',
      content: 'Test content',
      position: { x: 0, y: 0 }
    };
  });

  it('should render passage title input', () => {
    render(<PassageEditor passage={mockPassage} />);
    const input = screen.getByLabelText('Title') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('Test Passage');
  });

  it('should render passage content textarea', () => {
    render(<PassageEditor passage={mockPassage} />);
    const textarea = screen.getByLabelText('Content') as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe('Test content');
  });

  it('should update title on input', () => {
    const onChange = vi.fn();
    render(<PassageEditor passage={mockPassage} onChange={onChange} />);
    const input = screen.getByLabelText('Title') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Title' } });
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].title).toBe('New Title');
  });

  it('should update content on input', () => {
    const onChange = vi.fn();
    render(<PassageEditor passage={mockPassage} onChange={onChange} />);
    const textarea = screen.getByLabelText('Content') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'New content' } });
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].content).toBe('New content');
  });

  it('should maintain passage id on updates', () => {
    const onChange = vi.fn();
    render(<PassageEditor passage={mockPassage} onChange={onChange} />);
    const input = screen.getByLabelText('Title') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Title' } });
    expect(onChange.mock.calls[0][0].id).toBe('passage-1');
  });

  it('should maintain passage position on updates', () => {
    const onChange = vi.fn();
    render(<PassageEditor passage={mockPassage} onChange={onChange} />);
    const input = screen.getByLabelText('Title') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Title' } });
    expect(onChange.mock.calls[0][0].position).toEqual({ x: 0, y: 0 });
  });

  it('should call onChange with updated passage', () => {
    const onChange = vi.fn();
    render(<PassageEditor passage={mockPassage} onChange={onChange} />);
    const input = screen.getByLabelText('Title') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Updated' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const updatedPassage = onChange.mock.calls[0][0];
    expect(updatedPassage).toMatchObject({
      id: 'passage-1',
      title: 'Updated',
      content: 'Test content',
      position: { x: 0, y: 0 }
    });
  });

  it('should apply custom className', () => {
    const { container } = render(<PassageEditor passage={mockPassage} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should apply custom style', () => {
    const { container } = render(<PassageEditor passage={mockPassage} style={{ backgroundColor: 'blue' }} />);
    expect(container.firstChild).toHaveStyle({ backgroundColor: 'blue' });
  });

  it('should handle empty title', () => {
    const emptyPassage = { ...mockPassage, title: '' };
    render(<PassageEditor passage={emptyPassage} />);
    const input = screen.getByLabelText('Title') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('should handle empty content', () => {
    const emptyPassage = { ...mockPassage, content: '' };
    render(<PassageEditor passage={emptyPassage} />);
    const textarea = screen.getByLabelText('Content') as HTMLTextAreaElement;
    expect(textarea.value).toBe('');
  });

  it('should handle multiline content', () => {
    const multilinePassage = { ...mockPassage, content: 'Line 1\nLine 2\nLine 3' };
    render(<PassageEditor passage={multilinePassage} />);
    const textarea = screen.getByLabelText('Content') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Line 1\nLine 2\nLine 3');
  });

  it('should work without onChange callback', () => {
    render(<PassageEditor passage={mockPassage} />);
    const input = screen.getByLabelText('Title') as HTMLInputElement;
    expect(() => {
      fireEvent.change(input, { target: { value: 'New Title' } });
    }).not.toThrow();
  });
});

describe('useStory', () => {
  let mockStory: Story;

  beforeEach(() => {
    mockStory = {
      id: 'story-1',
      name: 'Test Story',
      author: 'Test Author',
      startPassage: 'Start',
      passages: [
        {
          id: 'passage-1',
          title: 'Start',
          content: 'Start passage',
          position: { x: 0, y: 0 }
        },
        {
          id: 'passage-2',
          title: 'Second',
          content: 'Second passage',
          position: { x: 100, y: 0 }
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  it('should initialize with story and start passage', () => {
    const { result } = renderHook(() => useStory(mockStory));
    expect(result.current.story).toEqual(mockStory);
    expect(result.current.currentPassage).toBe('Start');
    expect(result.current.visitedPassages).toEqual([]);
  });

  it('should navigate to a passage', () => {
    const { result } = renderHook(() => useStory(mockStory));
    act(() => {
      result.current.navigateTo('Second');
    });
    expect(result.current.currentPassage).toBe('Second');
    expect(result.current.visitedPassages).toEqual(['Second']);
  });

  it('should track visited passages', () => {
    const { result } = renderHook(() => useStory(mockStory));
    act(() => {
      result.current.navigateTo('Second');
      result.current.navigateTo('Start');
      result.current.navigateTo('Second');
    });
    expect(result.current.visitedPassages).toEqual(['Second', 'Start', 'Second']);
  });

  it('should get current passage', () => {
    const { result } = renderHook(() => useStory(mockStory));
    expect(result.current.getCurrentPassage()).toEqual(mockStory.passages[0]);
    act(() => {
      result.current.navigateTo('Second');
    });
    expect(result.current.getCurrentPassage()).toEqual(mockStory.passages[1]);
  });

  it('should return null for non-existent passage', () => {
    const { result } = renderHook(() => useStory(mockStory));
    act(() => {
      result.current.navigateTo('NonExistent');
    });
    expect(result.current.getCurrentPassage()).toBeNull();
  });

  it('should update a passage', () => {
    const { result } = renderHook(() => useStory(mockStory));
    const updatedPassage: Passage = {
      ...mockStory.passages[0],
      title: 'Updated Title',
      content: 'Updated content'
    };
    act(() => {
      result.current.updatePassage(updatedPassage);
    });
    expect(result.current.story.passages[0].title).toBe('Updated Title');
    expect(result.current.story.passages[0].content).toBe('Updated content');
  });

  it('should not update passage with different id', () => {
    const { result } = renderHook(() => useStory(mockStory));
    const updatedPassage: Passage = {
      id: 'non-existent',
      title: 'Updated Title',
      content: 'Updated content',
      position: { x: 0, y: 0 }
    };
    act(() => {
      result.current.updatePassage(updatedPassage);
    });
    expect(result.current.story.passages[0].title).toBe('Start');
  });

  it('should add a new passage', () => {
    const { result } = renderHook(() => useStory(mockStory));
    const newPassage: Passage = {
      id: 'passage-3',
      title: 'New Passage',
      content: 'New content',
      position: { x: 200, y: 0 }
    };
    act(() => {
      result.current.addPassage(newPassage);
    });
    expect(result.current.story.passages).toHaveLength(3);
    expect(result.current.story.passages[2]).toEqual(newPassage);
  });

  it('should remove a passage', () => {
    const { result } = renderHook(() => useStory(mockStory));
    act(() => {
      result.current.removePassage('passage-2');
    });
    expect(result.current.story.passages).toHaveLength(1);
    expect(result.current.story.passages[0].id).toBe('passage-1');
  });

  it('should not remove non-existent passage', () => {
    const { result } = renderHook(() => useStory(mockStory));
    act(() => {
      result.current.removePassage('non-existent');
    });
    expect(result.current.story.passages).toHaveLength(2);
  });

  it('should handle story without start passage', () => {
    const storyNoStart = { ...mockStory, startPassage: '' };
    const { result } = renderHook(() => useStory(storyNoStart));
    expect(result.current.currentPassage).toBe('');
  });

  it('should preserve story metadata on passage updates', () => {
    const { result } = renderHook(() => useStory(mockStory));
    const updatedPassage: Passage = {
      ...mockStory.passages[0],
      title: 'Updated'
    };
    act(() => {
      result.current.updatePassage(updatedPassage);
    });
    expect(result.current.story.name).toBe('Test Story');
    expect(result.current.story.author).toBe('Test Author');
    expect(result.current.story.startPassage).toBe('Start');
  });

  it('should handle multiple passage additions', () => {
    const { result } = renderHook(() => useStory(mockStory));
    const newPassage1: Passage = {
      id: 'passage-3',
      title: 'Third',
      content: 'Third passage',
      position: { x: 200, y: 0 }
    };
    const newPassage2: Passage = {
      id: 'passage-4',
      title: 'Fourth',
      content: 'Fourth passage',
      position: { x: 300, y: 0 }
    };
    act(() => {
      result.current.addPassage(newPassage1);
      result.current.addPassage(newPassage2);
    });
    expect(result.current.story.passages).toHaveLength(4);
  });

  it('should handle multiple passage removals', () => {
    const { result } = renderHook(() => useStory(mockStory));
    act(() => {
      result.current.removePassage('passage-1');
      result.current.removePassage('passage-2');
    });
    expect(result.current.story.passages).toHaveLength(0);
  });
});
