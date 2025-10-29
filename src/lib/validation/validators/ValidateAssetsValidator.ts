/**
 * Assets Validator
 *
 * Validates asset references and checks for broken links.
 */

import type { Story } from '../../models/Story';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

export class ValidateAssetsValidator implements Validator {
  name = 'validate_assets';
  category = 'content' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Get all asset IDs
    const assetIds = new Set<string>();
    if (story.assets) {
      story.assets.forEach((asset, id) => {
        assetIds.add(id);

        // Validate asset structure
        if (!asset.id) {
          issues.push({
            id: `asset_missing_id`,
            severity: 'error',
            category: 'content',
            message: 'Asset missing ID',
            description: 'Asset must have a unique ID.',
            fixable: false,
          });
        }

        if (!asset.name) {
          issues.push({
            id: `asset_${asset.id}_missing_name`,
            severity: 'warning',
            category: 'content',
            message: `Asset "${asset.id}": Missing name`,
            description: 'Asset should have a descriptive name.',
            fixable: false,
          });
        }

        if (!asset.path) {
          issues.push({
            id: `asset_${asset.id}_missing_path`,
            severity: 'error',
            category: 'content',
            message: `Asset "${asset.id}": Missing path`,
            description: 'Asset must have a path or data URI.',
            fixable: false,
          });
        }

        if (!asset.mimeType) {
          issues.push({
            id: `asset_${asset.id}_missing_mimetype`,
            severity: 'warning',
            category: 'content',
            message: `Asset "${asset.id}": Missing MIME type`,
            description: 'Asset should specify a MIME type (e.g., image/png).',
            fixable: false,
          });
        }

        // Warn about very large assets
        if (asset.size && asset.size > 5 * 1024 * 1024) {
          issues.push({
            id: `asset_${asset.id}_too_large`,
            severity: 'warning',
            category: 'content',
            message: `Asset "${asset.name}": Very large`,
            description: `Asset is ${(asset.size / 1024 / 1024).toFixed(1)}MB. Consider optimizing or using external hosting.`,
            fixable: false,
          });
        }
      });
    }

    // Check for broken asset references in passages
    const referencedAssets = new Set<string>();
    const assetUrlPattern = /asset:\/\/([a-zA-Z0-9_-]+)/g;

    story.passages.forEach((passage, passageId) => {
      // Check passage content
      let match;
      while ((match = assetUrlPattern.exec(passage.content)) !== null) {
        const assetId = match[1];
        referencedAssets.add(assetId);

        if (!assetIds.has(assetId)) {
          issues.push({
            id: `passage_${passageId}_broken_asset_${assetId}`,
            severity: 'error',
            category: 'content',
            message: `Broken asset reference in passage "${passage.title}"`,
            description: `Asset "asset://${assetId}" does not exist.`,
            fixable: false,
            passageId,
          });
        }
      }

      // Check onEnterScript and onExitScript
      [passage.onEnterScript, passage.onExitScript].forEach((script, scriptIndex) => {
        if (script) {
          let scriptMatch;
          while ((scriptMatch = assetUrlPattern.exec(script)) !== null) {
            const assetId = scriptMatch[1];
            referencedAssets.add(assetId);

            if (!assetIds.has(assetId)) {
              const scriptType = scriptIndex === 0 ? 'onEnterScript' : 'onExitScript';
              issues.push({
                id: `passage_${passageId}_${scriptType}_broken_asset_${assetId}`,
                severity: 'error',
                category: 'content',
                message: `Broken asset reference in passage "${passage.title}" ${scriptType}`,
                description: `Asset "asset://${assetId}" does not exist.`,
                fixable: false,
                passageId,
              });
            }
          }
        }
      });
    });

    // Check for unused assets
    assetIds.forEach(assetId => {
      if (!referencedAssets.has(assetId)) {
        const asset = story.getAsset(assetId);
        issues.push({
          id: `asset_${assetId}_unused`,
          severity: 'info',
          category: 'content',
          message: `Unused asset "${asset?.name || assetId}"`,
          description: 'This asset is not referenced in any passage.',
          fixable: true,
          fixDescription: 'Remove unused asset',
          fixAction: () => {
            story.removeAsset(assetId);
          }
        });
      }
    });

    return issues;
  }
}
