import { describe, it, expect } from 'vitest';
import { ValidateAssetsValidator } from './ValidateAssetsValidator';
import { Story } from '../../models/Story';
import { Passage } from '../../models/Passage';

const createStory = () => {
  const story = new Story({
    metadata: {
      title: 'Test Story',
      author: 'Test Author',
      version: '1.0.0',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
  });
  story.passages.clear();
  return story;
};

describe('ValidateAssetsValidator', () => {
  it('should have correct metadata', () => {
    const validator = new ValidateAssetsValidator();
    expect(validator.name).toBe('validate_assets');
    expect(validator.category).toBe('content');
  });

  it('should pass with valid assets', () => {
    const story = createStory();
    story.addAsset({
      id: 'img1',
      name: 'Test Image',
      path: 'path/to/image.png',
      mimeType: 'image/png',
    });

    // Add passage that references the asset
    const passage = new Passage({
      title: 'Test',
      content: 'Image: asset://img1',
      position: { x: 0, y: 0 },
    });
    story.addPassage(passage);

    const validator = new ValidateAssetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should error when asset missing ID', () => {
    const story = createStory();
    story.addAsset({ id: '', name: 'Test', path: 'path', mimeType: 'image/png' });

    const validator = new ValidateAssetsValidator();
    const issues = validator.validate(story);

    expect(issues.some(i => i.message.includes('missing ID'))).toBe(true);
  });

  it('should error when asset missing path', () => {
    const story = createStory();
    story.addAsset({ id: 'asset1', name: 'Test', path: '', mimeType: 'image/png' });

    const validator = new ValidateAssetsValidator();
    const issues = validator.validate(story);

    expect(issues.some(i => i.message.includes('Missing path'))).toBe(true);
  });

  it('should warn about very large assets', () => {
    const story = createStory();
    story.addAsset({
      id: 'large',
      name: 'Large Asset',
      path: 'path',
      mimeType: 'video/mp4',
      size: 10 * 1024 * 1024, // 10MB
    });

    // Add passage that references the asset to avoid "unused" warning
    const passage = new Passage({
      title: 'Test',
      content: 'Video: asset://large',
      position: { x: 0, y: 0 },
    });
    story.addPassage(passage);

    const validator = new ValidateAssetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('Very large');
  });

  it('should detect broken asset references', () => {
    const story = createStory();
    const passage = new Passage({
      title: 'Test',
      content: 'Image: asset://missing-asset',
      position: { x: 0, y: 0 },
    });
    story.addPassage(passage);

    const validator = new ValidateAssetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('Broken asset reference');
    expect(issues[0].passageId).toBe(passage.id);
  });

  it('should detect unused assets', () => {
    const story = createStory();
    story.addAsset({ id: 'unused', name: 'Unused', path: 'path', mimeType: 'image/png' });

    const validator = new ValidateAssetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('info');
    expect(issues[0].message).toContain('Unused asset');
    expect(issues[0].fixable).toBe(true);
  });

  it('should provide fix for unused assets', () => {
    const story = createStory();
    story.addAsset({ id: 'unused', name: 'Unused', path: 'path', mimeType: 'image/png' });

    const validator = new ValidateAssetsValidator();
    const issues = validator.validate(story);

    expect(issues[0].fix).toBeDefined();
    issues[0].fix?.apply();

    expect(story.assets.size).toBe(0);
  });

  it('should pass when assets are referenced', () => {
    const story = createStory();
    story.addAsset({ id: 'used', name: 'Used', path: 'path', mimeType: 'image/png' });

    const passage = new Passage({
      title: 'Test',
      content: 'Image: asset://used',
      position: { x: 0, y: 0 },
    });
    story.addPassage(passage);

    const validator = new ValidateAssetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should detect references in scripts', () => {
    const story = createStory();
    story.addAsset({ id: 'used', name: 'Used', path: 'path', mimeType: 'audio/mp3' });

    const passage = new Passage({
      title: 'Test',
      content: 'Test',
      position: { x: 0, y: 0 },
      onEnterScript: 'playSound("asset://used")',
    });
    story.addPassage(passage);

    const validator = new ValidateAssetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });
});
