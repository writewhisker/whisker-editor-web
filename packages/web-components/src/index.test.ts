/**
 * Web Components Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WhiskerElement, StoryPlayer, PassageEditor, registerComponents } from './index.js';
import type { Story, Passage } from '@writewhisker/story-models';

describe('WhiskerElement', () => {
  let element: WhiskerElement;

  beforeEach(() => {
    element = new WhiskerElement();
  });

  it('should create a shadow root on construction', () => {
    expect(element.shadowRoot).toBeDefined();
    expect(element.shadowRoot?.mode).toBe('open');
  });

  it('should call render on connectedCallback', () => {
    const renderSpy = vi.spyOn(element as any, 'render');
    element.connectedCallback();
    expect(renderSpy).toHaveBeenCalledOnce();
  });

  describe('createElement', () => {
    it('should create an element with tag name', () => {
      const div = (element as any).createElement('div');
      expect(div.tagName).toBe('DIV');
    });

    it('should set attributes from props', () => {
      const div = (element as any).createElement('div', { id: 'test', class: 'foo' });
      expect(div.getAttribute('id')).toBe('test');
      expect(div.getAttribute('class')).toBe('foo');
    });

    it('should set className from props', () => {
      const div = (element as any).createElement('div', { className: 'test-class' });
      expect(div.className).toBe('test-class');
    });

    it('should set style object from props', () => {
      const div = (element as any).createElement('div', { style: { color: 'red', fontSize: '16px' } });
      expect(div.style.color).toBe('red');
      expect(div.style.fontSize).toBe('16px');
    });

    it('should add event listeners from props', () => {
      const clickHandler = vi.fn();
      const div = (element as any).createElement('div', { onClick: clickHandler });
      div.click();
      expect(clickHandler).toHaveBeenCalledOnce();
    });

    it('should append string children as text nodes', () => {
      const div = (element as any).createElement('div', {}, ['Hello', ' World']);
      expect(div.textContent).toBe('Hello World');
    });

    it('should append element children', () => {
      const span = document.createElement('span');
      span.textContent = 'Test';
      const div = (element as any).createElement('div', {}, [span]);
      expect(div.querySelector('span')).toBe(span);
      expect(div.textContent).toBe('Test');
    });

    it('should handle mixed children', () => {
      const span = document.createElement('span');
      span.textContent = 'Element';
      const div = (element as any).createElement('div', {}, ['Text ', span, ' More']);
      expect(div.textContent).toBe('Text Element More');
    });
  });
});

describe('StoryPlayer', () => {
  let player: StoryPlayer;
  let mockStory: Story;

  beforeEach(() => {
    player = new StoryPlayer();
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

  afterEach(() => {
    player.remove();
  });

  it('should have observed attributes', () => {
    expect(StoryPlayer.observedAttributes).toEqual(['story-data']);
  });

  describe('setStory', () => {
    it('should set the story and current passage', () => {
      player.setStory(mockStory);
      expect((player as any).story).toBe(mockStory);
      expect((player as any).currentPassage).toBe('Start');
    });

    it('should render after setting story', () => {
      const renderSpy = vi.spyOn(player as any, 'render');
      player.setStory(mockStory);
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should handle story without startPassage', () => {
      const storyNoStart = { ...mockStory, startPassage: '' };
      player.setStory(storyNoStart);
      expect((player as any).currentPassage).toBeNull();
    });
  });

  describe('attributeChangedCallback', () => {
    it('should parse and set story from story-data attribute', () => {
      const storyData = JSON.stringify(mockStory);
      player.attributeChangedCallback('story-data', '', storyData);
      expect((player as any).story).toEqual(mockStory);
      expect((player as any).currentPassage).toBe('Start');
    });

    it('should handle invalid JSON gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      player.attributeChangedCallback('story-data', '', 'invalid json');
      expect(consoleSpy).toHaveBeenCalled();
      expect((player as any).story).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should not parse if newValue is empty', () => {
      const renderSpy = vi.spyOn(player as any, 'render');
      player.attributeChangedCallback('story-data', '', '');
      expect(renderSpy).not.toHaveBeenCalled();
    });
  });

  describe('navigateTo', () => {
    beforeEach(() => {
      player.setStory(mockStory);
    });

    it('should change current passage', () => {
      player.navigateTo('Continue');
      expect((player as any).currentPassage).toBe('Continue');
    });

    it('should render after navigation', () => {
      const renderSpy = vi.spyOn(player as any, 'render');
      player.navigateTo('Continue');
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should dispatch navigate event', () => {
      const eventSpy = vi.fn();
      player.addEventListener('navigate', eventSpy);
      player.navigateTo('Continue');
      expect(eventSpy).toHaveBeenCalled();
      expect(eventSpy.mock.calls[0][0].detail.passage).toBe('Continue');
    });
  });

  describe('render', () => {
    it('should show "No story loaded" when no story is set', () => {
      document.body.appendChild(player);
      player.connectedCallback();
      expect(player.shadowRoot?.textContent).toContain('No story loaded');
    });

    it('should show "Passage not found" for missing passage', () => {
      player.setStory(mockStory);
      (player as any).currentPassage = 'NonExistent';
      document.body.appendChild(player);
      player.connectedCallback();
      expect(player.shadowRoot?.textContent).toContain('Passage not found: NonExistent');
    });

    it('should render passage title and content', () => {
      player.setStory(mockStory);
      document.body.appendChild(player);
      expect(player.shadowRoot?.textContent).toContain('Start');
      expect(player.shadowRoot?.textContent).toContain('Welcome to the story!');
    });

    it('should include styles in shadow root', () => {
      player.setStory(mockStory);
      document.body.appendChild(player);
      const style = player.shadowRoot?.querySelector('style');
      expect(style).toBeDefined();
      expect(style?.textContent).toContain('.passage');
    });

    it('should render links as buttons', () => {
      player.setStory(mockStory);
      document.body.appendChild(player);
      const links = player.shadowRoot?.querySelectorAll('.link');
      expect(links?.length).toBe(1);
      expect(links?.[0].textContent).toBe('Continue');
      expect(links?.[0].getAttribute('data-target')).toBe('Continue');
    });

    it('should handle links with custom text', () => {
      player.setStory(mockStory);
      player.navigateTo('Continue');
      const links = player.shadowRoot?.querySelectorAll('.link');
      expect(links?.length).toBe(1);
      expect(links?.[0].textContent).toBe('Go back');
      expect(links?.[0].getAttribute('data-target')).toBe('Start');
    });

    it('should navigate when link is clicked', () => {
      player.setStory(mockStory);
      document.body.appendChild(player);
      const link = player.shadowRoot?.querySelector('.link') as HTMLElement;
      link.click();
      expect((player as any).currentPassage).toBe('Continue');
    });

    it('should render passage without links', () => {
      player.setStory(mockStory);
      player.navigateTo('Dead End');
      const links = player.shadowRoot?.querySelectorAll('.link');
      expect(links?.length).toBe(0);
      expect(player.shadowRoot?.textContent).toContain('No links here');
    });
  });

  describe('processContent', () => {
    beforeEach(() => {
      player.setStory(mockStory);
    });

    it('should convert simple links', () => {
      const result = (player as any).processContent('Text [[Link]] more');
      expect(result).toContain('button');
      expect(result).toContain('data-target="Link"');
      expect(result).toContain('>Link</button>');
    });

    it('should convert links with custom text', () => {
      const result = (player as any).processContent('[[Text|Target]]');
      expect(result).toContain('data-target="Target"');
      expect(result).toContain('>Text</button>');
    });

    it('should handle multiple links', () => {
      const result = (player as any).processContent('[[Link1]] and [[Link2]]');
      expect(result).toContain('data-target="Link1"');
      expect(result).toContain('data-target="Link2"');
    });

    it('should preserve text without links', () => {
      const result = (player as any).processContent('Plain text');
      expect(result).toBe('Plain text');
    });
  });

  describe('escapeHTML', () => {
    it('should escape ampersands', () => {
      expect((player as any).escapeHTML('A & B')).toBe('A &amp; B');
    });

    it('should escape less than', () => {
      expect((player as any).escapeHTML('A < B')).toBe('A &lt; B');
    });

    it('should escape greater than', () => {
      expect((player as any).escapeHTML('A > B')).toBe('A &gt; B');
    });

    it('should escape double quotes', () => {
      expect((player as any).escapeHTML('Say "hello"')).toBe('Say &quot;hello&quot;');
    });

    it('should escape single quotes', () => {
      expect((player as any).escapeHTML("It's")).toBe('It&#039;s');
    });

    it('should escape multiple special characters', () => {
      const result = (player as any).escapeHTML('<script>"alert(\'XSS\')"</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });
  });
});

describe('PassageEditor', () => {
  let editor: PassageEditor;
  let mockPassage: Passage;

  beforeEach(() => {
    editor = new PassageEditor();
    mockPassage = {
      id: 'passage-1',
      title: 'Test Passage',
      content: 'Test content',
      position: { x: 0, y: 0 }
    };
  });

  afterEach(() => {
    editor.remove();
  });

  describe('setPassage', () => {
    it('should set the passage', () => {
      editor.setPassage(mockPassage);
      expect(editor.getPassage()).toBe(mockPassage);
    });

    it('should render after setting passage', () => {
      const renderSpy = vi.spyOn(editor as any, 'render');
      editor.setPassage(mockPassage);
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('getPassage', () => {
    it('should return null when no passage is set', () => {
      expect(editor.getPassage()).toBeNull();
    });

    it('should return the current passage', () => {
      editor.setPassage(mockPassage);
      expect(editor.getPassage()).toBe(mockPassage);
    });
  });

  describe('render', () => {
    it('should show "No passage loaded" when no passage is set', () => {
      document.body.appendChild(editor);
      editor.connectedCallback();
      expect(editor.shadowRoot?.textContent).toContain('No passage loaded');
    });

    it('should render passage title input', () => {
      editor.setPassage(mockPassage);
      document.body.appendChild(editor);
      const input = editor.shadowRoot?.querySelector('input[type="text"]') as HTMLInputElement;
      expect(input).toBeDefined();
      expect(input.value).toBe('Test Passage');
    });

    it('should render passage content textarea', () => {
      editor.setPassage(mockPassage);
      document.body.appendChild(editor);
      const textarea = editor.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea).toBeDefined();
      expect(textarea.value).toBe('Test content');
    });

    it('should include styles in shadow root', () => {
      editor.setPassage(mockPassage);
      document.body.appendChild(editor);
      const style = editor.shadowRoot?.querySelector('style');
      expect(style).toBeDefined();
      expect(style?.textContent).toContain('.editor');
    });

    it('should update passage on title input', () => {
      editor.setPassage(mockPassage);
      document.body.appendChild(editor);
      const input = editor.shadowRoot?.querySelector('input[type="text"]') as HTMLInputElement;
      input.value = 'New Title';
      input.dispatchEvent(new Event('input'));
      expect(mockPassage.title).toBe('New Title');
    });

    it('should update passage on content input', () => {
      editor.setPassage(mockPassage);
      document.body.appendChild(editor);
      const textarea = editor.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement;
      textarea.value = 'New content';
      textarea.dispatchEvent(new Event('input'));
      expect(mockPassage.content).toBe('New content');
    });

    it('should dispatch change event on title input', () => {
      editor.setPassage(mockPassage);
      document.body.appendChild(editor);
      const eventSpy = vi.fn();
      editor.addEventListener('change', eventSpy);
      const input = editor.shadowRoot?.querySelector('input[type="text"]') as HTMLInputElement;
      input.value = 'New Title';
      input.dispatchEvent(new Event('input'));
      expect(eventSpy).toHaveBeenCalled();
      expect(eventSpy.mock.calls[0][0].detail.passage).toBe(mockPassage);
    });

    it('should dispatch change event on content input', () => {
      editor.setPassage(mockPassage);
      document.body.appendChild(editor);
      const eventSpy = vi.fn();
      editor.addEventListener('change', eventSpy);
      const textarea = editor.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement;
      textarea.value = 'New content';
      textarea.dispatchEvent(new Event('input'));
      expect(eventSpy).toHaveBeenCalled();
      expect(eventSpy.mock.calls[0][0].detail.passage).toBe(mockPassage);
    });
  });
});

describe('registerComponents', () => {
  it('should register custom elements', () => {
    registerComponents();
    expect(customElements.get('whisker-story-player')).toBeDefined();
    expect(customElements.get('whisker-passage-editor')).toBeDefined();
  });

  it('should not re-register if already registered', () => {
    registerComponents();
    const StoryPlayerClass = customElements.get('whisker-story-player');
    registerComponents();
    expect(customElements.get('whisker-story-player')).toBe(StoryPlayerClass);
  });
});
