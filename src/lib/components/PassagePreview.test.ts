import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import PassagePreview from './PassagePreview.svelte';
import { Passage } from '@writewhisker/core-ts';

// Mock tagActions
const mockGetTagColor = vi.fn();
vi.mock('$lib/stores/tagStore', () => ({
  tagActions: {
    getTagColor: (tag: string) => mockGetTagColor(tag),
  },
}));

describe('PassagePreview', () => {
  let passage: Passage;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTagColor.mockReturnValue('#3b82f6');

    passage = new Passage({
      id: 'test-id',
      title: 'Test Passage',
      content: 'This is test content for the passage.',
      tags: ['tag1', 'tag2'],
      created: new Date('2025-01-15').toISOString(),
    });
    passage.addChoice({ id: 'c1', text: 'Choice 1', target: 'p1' } as any);
    passage.addChoice({ id: 'c2', text: 'Choice 2', target: 'p2' } as any);
  });

  describe('rendering', () => {
    it('should not render when show is false', () => {
      const { container } = render(PassagePreview, {
        props: { passage, show: false, x: 0, y: 0 },
      });
      expect(container.querySelector('.fixed')).toBeNull();
    });

    it('should render when show is true', () => {
      const { container } = render(PassagePreview, {
        props: { passage, show: true, x: 0, y: 0 },
      });
      expect(container.querySelector('.fixed')).toBeTruthy();
    });

    it('should render at specified position', () => {
      const { container } = render(PassagePreview, {
        props: { passage, show: true, x: 100, y: 200 },
      });
      const preview = container.querySelector('.fixed') as HTMLElement;
      expect(preview.style.left).toBe('100px');
      expect(preview.style.top).toBe('200px');
    });
  });

  describe('title and id', () => {
    it('should display passage title', () => {
      const { getByText } = render(PassagePreview, {
        props: { passage, show: true, x: 0, y: 0 },
      });
      expect(getByText('Test Passage')).toBeTruthy();
    });

    it('should display truncated passage id', () => {
      const { container } = render(PassagePreview, {
        props: { passage, show: true, x: 0, y: 0 },
      });
      const text = container.textContent || '';
      expect(text).toContain('#' + passage.id.substring(0, 6));
    });
  });

  describe('content preview', () => {
    it('should display content when under 100 characters', () => {
      const testPassage = new Passage({ title: 'Test', content: 'Short content' });
      const { getByText } = render(PassagePreview, {
        props: { passage: testPassage, show: true, x: 0, y: 0 },
      });
      expect(getByText('Short content')).toBeTruthy();
    });

    it('should truncate content over 100 characters', () => {
      const testPassage = new Passage({ title: 'Test', content: 'a'.repeat(150) });
      const { container } = render(PassagePreview, {
        props: { passage: testPassage, show: true, x: 0, y: 0 },
      });
      const text = container.textContent || '';
      expect(text).toContain('...');
    });

    it('should show empty message for empty passage', () => {
      const testPassage = new Passage({ title: 'Test', content: '' });
      const { getByText } = render(PassagePreview, {
        props: { passage: testPassage, show: true, x: 0, y: 0 },
      });
      expect(getByText('(Empty passage)')).toBeTruthy();
    });

    it('should display whitespace for whitespace-only passage', () => {
      const testPassage = new Passage({ title: 'Test', content: '   ' });
      const { container } = render(PassagePreview, {
        props: { passage: testPassage, show: true, x: 0, y: 0 },
      });
      // Whitespace is truthy, so it displays as-is, not as empty message
      const contentDiv = container.querySelector('.text-xs.text-gray-700');
      expect(contentDiv?.textContent).toBe('   ');
    });
  });

  describe('tags', () => {
    it('should display passage tags', () => {
      const { container } = render(PassagePreview, {
        props: { passage, show: true, x: 0, y: 0 },
      });
      const text = container.textContent || '';
      expect(text).toContain('tag1');
      expect(text).toContain('tag2');
    });

    it('should not display tags section when no tags', () => {
      const testPassage = new Passage({ title: 'Test', tags: [] });
      const { container } = render(PassagePreview, {
        props: { passage: testPassage, show: true, x: 0, y: 0 },
      });
      const text = container.textContent || '';
      expect(text).not.toContain('tag1');
    });

    it('should display max 5 tags', () => {
      const testPassage = new Passage({
        title: 'Test',
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7'],
      });
      const { container } = render(PassagePreview, {
        props: { passage: testPassage, show: true, x: 0, y: 0 },
      });
      const tagSpans = container.querySelectorAll('.inline-block.px-1\\.5');
      expect(tagSpans.length).toBe(5);
    });

    it('should show overflow count when more than 5 tags', () => {
      const testPassage = new Passage({
        title: 'Test',
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7'],
      });
      const { container } = render(PassagePreview, {
        props: { passage: testPassage, show: true, x: 0, y: 0 },
      });
      const text = container.textContent || '';
      expect(text).toContain('+2');
    });

    it('should apply tag colors from tagActions', () => {
      mockGetTagColor.mockReturnValue('#ff0000');
      const { container } = render(PassagePreview, {
        props: { passage, show: true, x: 0, y: 0 },
      });
      const tagSpan = container.querySelector('.inline-block.px-1\\.5') as HTMLElement;
      expect(tagSpan?.style.backgroundColor).toBe('rgb(255, 0, 0)');
    });
  });

  describe('word count', () => {
    it('should display correct word count', () => {
      const testPassage = new Passage({ title: 'Test', content: 'one two three four five' });
      const { container } = render(PassagePreview, {
        props: { passage: testPassage, show: true, x: 0, y: 0 },
      });
      const text = container.textContent || '';
      expect(text).toContain('5 words');
    });

    it('should display singular word for single word', () => {
      const testPassage = new Passage({ title: 'Test', content: 'word' });
      const { container } = render(PassagePreview, {
        props: { passage: testPassage, show: true, x: 0, y: 0 },
      });
      const text = container.textContent || '';
      expect(text).toContain('1 word');
      expect(text).not.toContain('1 words');
    });

    it('should handle empty content word count', () => {
      const testPassage = new Passage({ title: 'Test', content: '' });
      const { container } = render(PassagePreview, {
        props: { passage: testPassage, show: true, x: 0, y: 0 },
      });
      const text = container.textContent || '';
      expect(text).toContain('0 words');
    });

    it('should count words correctly with multiple spaces', () => {
      const testPassage = new Passage({ title: 'Test', content: 'word1    word2   word3' });
      const { container } = render(PassagePreview, {
        props: { passage: testPassage, show: true, x: 0, y: 0 },
      });
      const text = container.textContent || '';
      expect(text).toContain('3 words');
    });
  });

  describe('choices count', () => {
    it('should display correct choice count', () => {
      const { container } = render(PassagePreview, {
        props: { passage, show: true, x: 0, y: 0 },
      });
      const text = container.textContent || '';
      expect(text).toContain('2 choices');
    });

    it('should display singular choice for single choice', () => {
      const testPassage = new Passage({ title: 'Test' });
      testPassage.addChoice({ id: 'c1', text: 'Choice 1', target: 'p1' } as any);
      const { container } = render(PassagePreview, {
        props: { passage: testPassage, show: true, x: 0, y: 0 },
      });
      const text = container.textContent || '';
      expect(text).toContain('1 choice');
      expect(text).not.toContain('1 choices');
    });

    it('should handle zero choices', () => {
      const testPassage = new Passage({ title: 'Test' });
      const { container } = render(PassagePreview, {
        props: { passage: testPassage, show: true, x: 0, y: 0 },
      });
      const text = container.textContent || '';
      expect(text).toContain('0 choices');
    });
  });

  describe('created date', () => {
    it('should display formatted created date', () => {
      const { container } = render(PassagePreview, {
        props: { passage, show: true, x: 0, y: 0 },
      });
      const text = container.textContent || '';
      expect(text).toContain('🕒');
      // Date should be formatted as locale date string
      const expectedDate = new Date(passage.created).toLocaleDateString();
      expect(text).toContain(expectedDate);
    });

    it('should not display date section when created is explicitly null', () => {
      const testPassage = new Passage({ title: 'Test' });
      testPassage.created = null as any; // Explicitly set to null to test conditional
      const { container } = render(PassagePreview, {
        props: { passage: testPassage, show: true, x: 0, y: 0 },
      });
      const timeIcons = Array.from(container.querySelectorAll('span')).filter(
        span => span.textContent === '🕒'
      );
      expect(timeIcons.length).toBe(0);
    });
  });

  describe('stats icons', () => {
    it('should display word count icon', () => {
      const { container } = render(PassagePreview, {
        props: { passage, show: true, x: 0, y: 0 },
      });
      const text = container.textContent || '';
      expect(text).toContain('📝');
    });

    it('should display choices arrow icon', () => {
      const { container } = render(PassagePreview, {
        props: { passage, show: true, x: 0, y: 0 },
      });
      const text = container.textContent || '';
      expect(text).toContain('→');
    });
  });

  describe('styling', () => {
    it('should have pointer-events-none class', () => {
      const { container } = render(PassagePreview, {
        props: { passage, show: true, x: 0, y: 0 },
      });
      const preview = container.querySelector('.pointer-events-none');
      expect(preview).toBeTruthy();
    });

    it('should have high z-index for layering', () => {
      const { container } = render(PassagePreview, {
        props: { passage, show: true, x: 0, y: 0 },
      });
      const preview = container.querySelector('.z-\\[100\\]');
      expect(preview).toBeTruthy();
    });

    it('should have shadow and rounded corners', () => {
      const { container } = render(PassagePreview, {
        props: { passage, show: true, x: 0, y: 0 },
      });
      const card = container.querySelector('.shadow-2xl.rounded-lg');
      expect(card).toBeTruthy();
    });

    it('should have max width constraint', () => {
      const { container } = render(PassagePreview, {
        props: { passage, show: true, x: 0, y: 0 },
      });
      const card = container.querySelector('.max-w-sm');
      expect(card).toBeTruthy();
    });
  });
});
