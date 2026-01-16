import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import type {
  ImageNode,
  AudioNode,
  VideoNode,
  EmbedNode,
  AudioAttributes,
  VideoAttributes,
  EmbedAttributes,
} from './ast';

describe('Media Parsing', () => {
  describe('Markdown Images', () => {
    it('should parse ![alt](src) as image', () => {
      const result = parse(':: Test\n![alt text](image.png)');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const image = content.find(n => n.type === 'image') as ImageNode;
      expect(image).not.toBeUndefined();
      expect(image.alt).toBe('alt text');
      expect(image.src).toBe('image.png');
    });

    it('should parse image with empty alt', () => {
      const result = parse(':: Test\n![](photo.jpg)');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const image = content.find(n => n.type === 'image') as ImageNode;
      expect(image).not.toBeUndefined();
      expect(image.alt).toBe('');
      expect(image.src).toBe('photo.jpg');
    });

    it('should parse image with URL src', () => {
      const result = parse(':: Test\n![Logo](https://example.com/logo.png)');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const image = content.find(n => n.type === 'image') as ImageNode;
      expect(image).not.toBeUndefined();
      expect(image.src).toContain('example.com');
    });

    it('should parse image in middle of text', () => {
      const result = parse(':: Test\nSee this ![image](pic.png) here');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const image = content.find(n => n.type === 'image') as ImageNode;
      expect(image).not.toBeUndefined();
    });
  });

  describe('@image Directive', () => {
    it('should parse @image(src)', () => {
      const result = parse(':: Test\n@image(photo.jpg)');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const image = content.find(n => n.type === 'image') as ImageNode;
      expect(image).not.toBeUndefined();
      expect(image.src).toBe('photo.jpg');
    });

    it('should parse @image with quoted src', () => {
      const result = parse(':: Test\n@image("path/to/image.png")');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const image = content.find(n => n.type === 'image') as ImageNode;
      expect(image).not.toBeUndefined();
      expect(image.src).toBe('path/to/image.png');
    });
  });

  describe('@video Directive', () => {
    it('should parse @video(src)', () => {
      const result = parse(':: Test\n@video(clip.mp4)');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const video = content.find(n => n.type === 'video') as VideoNode;
      expect(video).not.toBeUndefined();
      expect(video.src).toBe('clip.mp4');
    });

    it('should parse @video with URL', () => {
      const result = parse(':: Test\n@video(https://example.com/video.webm)');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const video = content.find(n => n.type === 'video') as VideoNode;
      expect(video).not.toBeUndefined();
      expect(video.src).toContain('video.webm');
    });
  });

  describe('@embed Directive', () => {
    it('should parse @embed(url)', () => {
      const result = parse(':: Test\n@embed(https://youtube.com/watch?v=123)');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const embed = content.find(n => n.type === 'embed') as EmbedNode;
      expect(embed).not.toBeUndefined();
      expect(embed.src).toContain('youtube.com');
    });

    it('should parse @embed with quoted URL', () => {
      const result = parse(':: Test\n@embed("https://example.com/embed")');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const embed = content.find(n => n.type === 'embed') as EmbedNode;
      expect(embed).not.toBeUndefined();
    });
  });

  describe('Multiple Media Elements', () => {
    it('should parse multiple images', () => {
      const result = parse(':: Test\n![one](1.png) and ![two](2.png)');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const images = content.filter(n => n.type === 'image');
      expect(images.length).toBe(2);
    });

    it('should parse mixed media types', () => {
      const result = parse(`:: Test
![Image](pic.png)
@video(clip.mp4)
@embed(https://example.com)`);
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const image = content.find(n => n.type === 'image');
      const video = content.find(n => n.type === 'video');
      const embed = content.find(n => n.type === 'embed');
      expect(image).not.toBeUndefined();
      expect(video).not.toBeUndefined();
      expect(embed).not.toBeUndefined();
    });
  });

  describe('Media with Other Content', () => {
    it('should parse image with conditionals', () => {
      const result = parse(`:: Test
{$showImage}
![Conditional Image](image.png)
{/}`);
      expect(result.ast).not.toBeNull();
    });

    it('should parse image in formatted text', () => {
      const result = parse(':: Test\n**Bold with ![image](pic.png) inside**');
      expect(result.ast).not.toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed image gracefully', () => {
      const result = parse(':: Test\n![unclosed');
      expect(result.ast).not.toBeNull();
      // Should not crash, content may be treated as text
    });

    it('should handle missing src gracefully', () => {
      const result = parse(':: Test\n![alt]()');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const image = content.find(n => n.type === 'image') as ImageNode;
      // May still create image node with empty src
      if (image) {
        expect(image.src).toBe('');
      }
    });
  });

  describe('@audio Directive', () => {
    it('should parse @audio(src)', () => {
      const result = parse(':: Test\n@audio(music.mp3)');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const audio = content.find(n => n.type === 'audio') as AudioNode;
      expect(audio).not.toBeUndefined();
      expect(audio.src).toBe('music.mp3');
    });

    it('should parse @audio with attributes', () => {
      const result = parse(':: Test\n@audio(bgm.ogg){loop autoplay volume:0.5}');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const audio = content.find(n => n.type === 'audio') as AudioNode;
      expect(audio).not.toBeUndefined();
      const attrs = audio.attributes as AudioAttributes;
      expect(attrs.loop).toBe(true);
      expect(attrs.autoplay).toBe(true);
      expect(attrs.volume).toBe(0.5);
    });
  });

  describe('Bracket-based Media', () => {
    it('should parse [audio](src) syntax', () => {
      const result = parse(':: Test\n[audio](sounds/click.mp3)');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const audio = content.find(n => n.type === 'audio') as AudioNode;
      expect(audio).not.toBeUndefined();
      expect(audio.src).toBe('sounds/click.mp3');
    });

    it('should parse [video](src) syntax', () => {
      const result = parse(':: Test\n[video](intro.mp4)');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const video = content.find(n => n.type === 'video') as VideoNode;
      expect(video).not.toBeUndefined();
      expect(video.src).toBe('intro.mp4');
    });

    it('should parse [embed](src) syntax', () => {
      const result = parse(':: Test\n[embed](https://example.com/widget)');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const embed = content.find(n => n.type === 'embed') as EmbedNode;
      expect(embed).not.toBeUndefined();
      expect(embed.src).toContain('example.com');
    });

    it('should parse [audio] with attributes', () => {
      const result = parse(':: Test\n[audio](music.ogg){loop controls}');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const audio = content.find(n => n.type === 'audio') as AudioNode;
      expect(audio).not.toBeUndefined();
      const attrs = audio.attributes as AudioAttributes;
      expect(attrs.loop).toBe(true);
      expect(attrs.controls).toBe(true);
    });

    it('should parse [video] with poster attribute', () => {
      const result = parse(':: Test\n[video](clip.mp4){poster:thumb.png controls}');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const video = content.find(n => n.type === 'video') as VideoNode;
      expect(video).not.toBeUndefined();
      const attrs = video.attributes as VideoAttributes;
      expect(attrs.poster).toBe('thumb.png');
      expect(attrs.controls).toBe(true);
    });

    it('should parse [embed] with sandbox attribute', () => {
      const result = parse(':: Test\n[embed](widget.html){sandbox}');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const embed = content.find(n => n.type === 'embed') as EmbedNode;
      expect(embed).not.toBeUndefined();
      const attrs = embed.attributes as EmbedAttributes;
      expect(attrs.sandbox).toBe(true);
    });
  });

  describe('Media Attributes', () => {
    it('should parse width and height', () => {
      const result = parse(':: Test\n![Hero](hero.png){width:200 height:150}');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const image = content.find(n => n.type === 'image') as ImageNode;
      expect(image).not.toBeUndefined();
      expect(image.attributes?.width).toBe('200');
      expect(image.attributes?.height).toBe('150');
    });

    it('should parse width with units', () => {
      const result = parse(':: Test\n@video(clip.mp4){width:640px}');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const video = content.find(n => n.type === 'video') as VideoNode;
      expect(video).not.toBeUndefined();
      // Note: depends on tokenization; may include 'px' or not
      expect(video.attributes?.width).toBeDefined();
    });

    it('should parse class attribute', () => {
      const result = parse(':: Test\n![Logo](logo.png){class:centered}');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const image = content.find(n => n.type === 'image') as ImageNode;
      expect(image).not.toBeUndefined();
      expect(image.attributes?.class).toBe('centered');
    });
  });
});
