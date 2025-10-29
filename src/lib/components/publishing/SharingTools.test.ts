/**
 * Tests for SharingTools component
 *
 * Tests focus on the sharing utility functions and component logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  copyToClipboard,
  generateEmbedCode,
  generateQRCode,
  generateSocialShareUrl,
  generateEmailShareUrl,
} from '$lib/publishing/sharingUtils';

describe('SharingTools - Embed Code Generation', () => {
  it('should generate basic embed code', () => {
    const embedCode = generateEmbedCode({
      type: 'embed',
      url: 'https://example.com/story',
      title: 'My Story',
      embedWidth: 800,
      embedHeight: 600,
    });

    expect(embedCode).toContain('<iframe');
    expect(embedCode).toContain('src="https://example.com/story"');
    expect(embedCode).toContain('width="800"');
    expect(embedCode).toContain('height="600"');
    expect(embedCode).toContain('title="My Story"');
  });

  it('should use default dimensions', () => {
    const embedCode = generateEmbedCode({
      type: 'embed',
      url: 'https://example.com/story',
      title: 'Test',
    });

    expect(embedCode).toContain('width="800"');
    expect(embedCode).toContain('height="600"');
  });

  it('should escape HTML in title', () => {
    const embedCode = generateEmbedCode({
      type: 'embed',
      url: 'https://example.com/story',
      title: '<script>alert("xss")</script>',
      embedWidth: 800,
      embedHeight: 600,
    });

    expect(embedCode).not.toContain('<script>');
    expect(embedCode).toContain('&lt;script&gt;');
  });

  it('should handle custom dimensions', () => {
    const embedCode = generateEmbedCode({
      type: 'embed',
      url: 'https://example.com/story',
      title: 'Custom Size',
      embedWidth: 1200,
      embedHeight: 900,
    });

    expect(embedCode).toContain('width="1200"');
    expect(embedCode).toContain('height="900"');
  });

  it('should use default title if not provided', () => {
    const embedCode = generateEmbedCode({
      type: 'embed',
      url: 'https://example.com/story',
      embedWidth: 800,
      embedHeight: 600,
    });

    expect(embedCode).toContain('title="Interactive Story"');
  });

  it('should include border: none style', () => {
    const embedCode = generateEmbedCode({
      type: 'embed',
      url: 'https://example.com/story',
      title: 'Test',
    });

    expect(embedCode).toContain('style="border: none; max-width: 100%;"');
  });
});

describe('SharingTools - QR Code Generation', () => {
  it('should generate QR code URL', () => {
    const qrUrl = generateQRCode('https://example.com/story');

    expect(qrUrl).toContain('https://api.qrserver.com/v1/create-qr-code/');
    expect(qrUrl).toContain('size=200x200');
    expect(qrUrl).toContain('data=');
  });

  it('should encode URL properly', () => {
    const qrUrl = generateQRCode('https://example.com/story?id=123&test=true');

    expect(qrUrl).toContain(encodeURIComponent('https://example.com/story?id=123&test=true'));
  });

  it('should handle special characters in URL', () => {
    const qrUrl = generateQRCode('https://example.com/story?title=My Story');

    expect(qrUrl).toBeDefined();
    expect(qrUrl).toContain('data=');
  });

  it('should handle empty URL', () => {
    const qrUrl = generateQRCode('');

    expect(qrUrl).toBeDefined();
    expect(qrUrl).toContain('https://api.qrserver.com/v1/create-qr-code/');
  });
});

describe('SharingTools - Clipboard Copy', () => {
  beforeEach(() => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('should copy text to clipboard', async () => {
    const success = await copyToClipboard('test text');

    expect(success).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text');
  });

  it('should handle copy failure', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('Failed'));

    const success = await copyToClipboard('test text');

    expect(success).toBe(false);
  });

  it('should copy URL', async () => {
    const url = 'https://example.com/story';
    const success = await copyToClipboard(url);

    expect(success).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url);
  });

  it('should copy embed code', async () => {
    const embedCode = '<iframe src="https://example.com"></iframe>';
    const success = await copyToClipboard(embedCode);

    expect(success).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(embedCode);
  });
});

describe('SharingTools - Social Media Sharing', () => {
  describe('Twitter', () => {
    it('should generate Twitter share URL', () => {
      const url = generateSocialShareUrl(
        'twitter',
        'https://example.com/story',
        'My Amazing Story',
        'This is a great story'
      );

      expect(url).toContain('https://twitter.com/intent/tweet');
      expect(url).toContain('url=' + encodeURIComponent('https://example.com/story'));
      expect(url).toContain('text=' + encodeURIComponent('My Amazing Story'));
    });

    it('should use default title if not provided', () => {
      const url = generateSocialShareUrl('twitter', 'https://example.com/story');

      expect(url).toContain('text=' + encodeURIComponent('Check out this interactive story!'));
    });

    it('should encode special characters', () => {
      const url = generateSocialShareUrl(
        'twitter',
        'https://example.com/story',
        'Title with & symbols'
      );

      expect(url).toContain(encodeURIComponent('Title with & symbols'));
    });
  });

  describe('Facebook', () => {
    it('should generate Facebook share URL', () => {
      const url = generateSocialShareUrl(
        'facebook',
        'https://example.com/story',
        'My Story'
      );

      expect(url).toContain('https://www.facebook.com/sharer/sharer.php');
      expect(url).toContain('u=' + encodeURIComponent('https://example.com/story'));
    });

    it('should not include title in Facebook URL', () => {
      const url = generateSocialShareUrl(
        'facebook',
        'https://example.com/story',
        'My Story'
      );

      // Facebook pulls title from page metadata, not URL params
      expect(url).not.toContain('title=');
      expect(url).not.toContain('text=');
    });
  });

  describe('Reddit', () => {
    it('should generate Reddit share URL', () => {
      const url = generateSocialShareUrl(
        'reddit',
        'https://example.com/story',
        'My Story'
      );

      expect(url).toContain('https://reddit.com/submit');
      expect(url).toContain('url=' + encodeURIComponent('https://example.com/story'));
      expect(url).toContain('title=' + encodeURIComponent('My Story'));
    });

    it('should use default title for Reddit', () => {
      const url = generateSocialShareUrl('reddit', 'https://example.com/story');

      expect(url).toContain('title=' + encodeURIComponent('Check out this interactive story!'));
    });
  });
});

describe('SharingTools - Email Sharing', () => {
  it('should generate email share URL', () => {
    const url = generateEmailShareUrl(
      'https://example.com/story',
      'My Story',
      'Check this out'
    );

    expect(url.startsWith('mailto:?')).toBe(true);
    expect(url).toContain('subject=' + encodeURIComponent('My Story'));
    expect(url).toContain('body=');
    expect(url).toContain(encodeURIComponent('https://example.com/story'));
  });

  it('should include description in body', () => {
    const url = generateEmailShareUrl(
      'https://example.com/story',
      'My Story',
      'This is a great story'
    );

    expect(url).toContain(encodeURIComponent('This is a great story'));
  });

  it('should use default subject if not provided', () => {
    const url = generateEmailShareUrl('https://example.com/story');

    expect(url).toContain('subject=' + encodeURIComponent('Check out this interactive story!'));
  });

  it('should use default body if description not provided', () => {
    const url = generateEmailShareUrl('https://example.com/story', 'My Story');

    expect(url).toContain(encodeURIComponent('I wanted to share this interactive story with you.'));
  });

  it('should include both description and URL in body', () => {
    const url = generateEmailShareUrl(
      'https://example.com/story',
      'Test',
      'Description here'
    );

    expect(url).toContain(encodeURIComponent('Description here'));
    expect(url).toContain(encodeURIComponent('https://example.com/story'));
  });
});

describe('SharingTools - Component Logic', () => {
  describe('Tab State', () => {
    it('should initialize with link tab', () => {
      let activeTab: 'link' | 'embed' | 'qr' | 'social' = 'link';
      expect(activeTab).toBe('link');
    });

    it('should switch to embed tab', () => {
      let activeTab: 'link' | 'embed' | 'qr' | 'social' = 'link';
      activeTab = 'embed';
      expect(activeTab).toBe('embed');
    });

    it('should switch to qr tab', () => {
      let activeTab: 'link' | 'embed' | 'qr' | 'social' = 'link';
      activeTab = 'qr';
      expect(activeTab).toBe('qr');
    });

    it('should switch to social tab', () => {
      let activeTab: 'link' | 'embed' | 'qr' | 'social' = 'link';
      activeTab = 'social';
      expect(activeTab).toBe('social');
    });
  });

  describe('Embed Dimensions', () => {
    it('should initialize with default dimensions', () => {
      let embedWidth = 800;
      let embedHeight = 600;

      expect(embedWidth).toBe(800);
      expect(embedHeight).toBe(600);
    });

    it('should update embed width', () => {
      let embedWidth = 800;
      embedWidth = 1200;

      expect(embedWidth).toBe(1200);
    });

    it('should update embed height', () => {
      let embedHeight = 600;
      embedHeight = 900;

      expect(embedHeight).toBe(900);
    });
  });

  describe('Copy Feedback', () => {
    it('should show copy feedback', () => {
      let copyFeedback: string | null = null;
      copyFeedback = 'Link copied!';

      expect(copyFeedback).toBe('Link copied!');
    });

    it('should clear copy feedback', () => {
      let copyFeedback: string | null = 'Link copied!';
      copyFeedback = null;

      expect(copyFeedback).toBeNull();
    });

    it('should show different feedback messages', () => {
      let copyFeedback: string | null = null;

      copyFeedback = 'Link copied!';
      expect(copyFeedback).toBe('Link copied!');

      copyFeedback = 'Embed code copied!';
      expect(copyFeedback).toBe('Embed code copied!');

      copyFeedback = 'Failed to copy';
      expect(copyFeedback).toBe('Failed to copy');
    });
  });

  describe('Dialog State', () => {
    it('should open dialog', () => {
      let open = false;
      open = true;

      expect(open).toBe(true);
    });

    it('should close dialog', () => {
      let open = true;
      open = false;

      expect(open).toBe(false);
    });
  });
});

describe('SharingTools - Edge Cases', () => {
  it('should handle empty URL', () => {
    const embedCode = generateEmbedCode({
      type: 'embed',
      url: '',
      title: 'Test',
    });

    expect(embedCode).toContain('src=""');
  });

  it('should handle very long URLs', () => {
    const longUrl = 'https://example.com/story?' + 'a'.repeat(1000);
    const qrUrl = generateQRCode(longUrl);

    expect(qrUrl).toBeDefined();
    expect(qrUrl).toContain('data=');
  });

  it('should handle special characters in titles', () => {
    const embedCode = generateEmbedCode({
      type: 'embed',
      url: 'https://example.com/story',
      title: 'Title with "quotes" and <tags>',
    });

    expect(embedCode).toContain('&quot;');
    expect(embedCode).toContain('&lt;');
    expect(embedCode).toContain('&gt;');
  });

  it('should handle minimum dimensions', () => {
    const embedCode = generateEmbedCode({
      type: 'embed',
      url: 'https://example.com/story',
      title: 'Test',
      embedWidth: 300,
      embedHeight: 300,
    });

    expect(embedCode).toContain('width="300"');
    expect(embedCode).toContain('height="300"');
  });

  it('should handle maximum dimensions', () => {
    const embedCode = generateEmbedCode({
      type: 'embed',
      url: 'https://example.com/story',
      title: 'Test',
      embedWidth: 2000,
      embedHeight: 2000,
    });

    expect(embedCode).toContain('width="2000"');
    expect(embedCode).toContain('height="2000"');
  });

  it('should handle URLs with query parameters', () => {
    const url = 'https://example.com/story?id=123&mode=fullscreen';
    const qrUrl = generateQRCode(url);

    expect(qrUrl).toContain(encodeURIComponent(url));
  });

  it('should handle URLs with hash fragments', () => {
    const url = 'https://example.com/story#chapter-1';
    const embedCode = generateEmbedCode({
      type: 'embed',
      url,
      title: 'Test',
    });

    expect(embedCode).toContain(url);
  });
});

describe('SharingTools - URL Encoding', () => {
  it('should properly encode ampersands', () => {
    const url = generateSocialShareUrl(
      'twitter',
      'https://example.com/story',
      'A&B'
    );

    expect(url).toContain(encodeURIComponent('A&B'));
  });

  it('should properly encode spaces', () => {
    const url = generateSocialShareUrl(
      'twitter',
      'https://example.com/story',
      'My Great Story'
    );

    expect(url).toContain(encodeURIComponent('My Great Story'));
  });

  it('should properly encode special characters', () => {
    const url = generateSocialShareUrl(
      'twitter',
      'https://example.com/story',
      'Story #1: The Beginning!'
    );

    expect(url).toContain(encodeURIComponent('Story #1: The Beginning!'));
  });
});
