/**
 * Version Diff Store
 *
 * Manages version comparison and diff visualization:
 * - Story version snapshots
 * - Passage-level and text-level diffs
 * - Change tracking and highlighting
 * - Version history management
 */

import { writable, derived } from 'svelte/store';
import type { Story } from '@writewhisker/core-ts';
import type { Passage } from '@writewhisker/core-ts';

export type ChangeType = 'added' | 'removed' | 'modified' | 'unchanged';
export type DiffLevel = 'passage' | 'text' | 'metadata';

export interface VersionSnapshot {
  id: string;
  timestamp: number;
  label: string;
  description: string;
  story: Story;
  author?: string;
}

export interface PassageDiff {
  passageId: string;
  changeType: ChangeType;
  oldPassage?: Passage;
  newPassage?: Passage;
  textChanges?: TextChange[];
  metadataChanges?: MetadataChange[];
}

export interface TextChange {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  lineNumber?: number;
}

export interface MetadataChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface StoryDiff {
  fromVersion: VersionSnapshot;
  toVersion: VersionSnapshot;
  passageDiffs: PassageDiff[];
  stats: DiffStats;
}

export interface DiffStats {
  passagesAdded: number;
  passagesRemoved: number;
  passagesModified: number;
  passagesUnchanged: number;
  linesAdded: number;
  linesRemoved: number;
}

export interface VersionDiffState {
  snapshots: VersionSnapshot[];
  currentDiff: StoryDiff | null;
  selectedFromVersion: string | null;
  selectedToVersion: string | null;
}

const DEFAULT_STATE: VersionDiffState = {
  snapshots: [],
  currentDiff: null,
  selectedFromVersion: null,
  selectedToVersion: null,
};

// Simple diff algorithm for text
function computeTextDiff(oldText: string, newText: string): TextChange[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const changes: TextChange[] = [];

  // Simple line-based diff (could be enhanced with proper diff algorithm)
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === newLine) {
      if (oldLine !== undefined) {
        changes.push({ type: 'unchanged', value: oldLine, lineNumber: i + 1 });
      }
    } else {
      if (oldLine !== undefined && newLine === undefined) {
        changes.push({ type: 'removed', value: oldLine, lineNumber: i + 1 });
      } else if (oldLine === undefined && newLine !== undefined) {
        changes.push({ type: 'added', value: newLine, lineNumber: i + 1 });
      } else if (oldLine !== newLine) {
        changes.push({ type: 'removed', value: oldLine, lineNumber: i + 1 });
        changes.push({ type: 'added', value: newLine, lineNumber: i + 1 });
      }
    }
  }

  return changes;
}

// Compare passage metadata
function computeMetadataChanges(oldPassage: Passage, newPassage: Passage): MetadataChange[] {
  const changes: MetadataChange[] = [];

  // Check title
  if (oldPassage.title !== newPassage.title) {
    changes.push({ field: 'title', oldValue: oldPassage.title, newValue: newPassage.title });
  }

  // Check tags
  const oldTags = JSON.stringify(oldPassage.tags?.sort());
  const newTags = JSON.stringify(newPassage.tags?.sort());
  if (oldTags !== newTags) {
    changes.push({ field: 'tags', oldValue: oldPassage.tags, newValue: newPassage.tags });
  }

  // Check position - handle both direct x/y and position object formats
  const oldPos = oldPassage.position || { x: (oldPassage as any).x, y: (oldPassage as any).y };
  const newPos = newPassage.position || { x: (newPassage as any).x, y: (newPassage as any).y };

  if (oldPos && newPos && (oldPos.x !== newPos.x || oldPos.y !== newPos.y)) {
    changes.push({
      field: 'position',
      oldValue: { x: oldPos.x, y: oldPos.y },
      newValue: { x: newPos.x, y: newPos.y },
    });
  }

  return changes;
}

// Compare two story versions
function computeStoryDiff(from: VersionSnapshot, to: VersionSnapshot): StoryDiff {
  const passageDiffs: PassageDiff[] = [];

  // Handle Map, object, and array formats for passages
  let oldPassagesMap: Map<string, Passage>;
  let newPassagesMap: Map<string, Passage>;

  if (from.story.passages instanceof Map) {
    oldPassagesMap = from.story.passages;
  } else if (Array.isArray(from.story.passages)) {
    const passagesArray = from.story.passages as Passage[];
    oldPassagesMap = new Map(passagesArray.map((p: Passage) => [p.id, p]));
  } else {
    oldPassagesMap = new Map(Object.entries(from.story.passages as Record<string, Passage>));
  }

  if (to.story.passages instanceof Map) {
    newPassagesMap = to.story.passages;
  } else if (Array.isArray(to.story.passages)) {
    const passagesArray = to.story.passages as Passage[];
    newPassagesMap = new Map(passagesArray.map((p: Passage) => [p.id, p]));
  } else {
    newPassagesMap = new Map(Object.entries(to.story.passages as Record<string, Passage>));
  }

  const allPassageIds = new Set([...oldPassagesMap.keys(), ...newPassagesMap.keys()]);

  let stats: DiffStats = {
    passagesAdded: 0,
    passagesRemoved: 0,
    passagesModified: 0,
    passagesUnchanged: 0,
    linesAdded: 0,
    linesRemoved: 0,
  };

  for (const passageId of allPassageIds) {
    const oldPassage = oldPassagesMap.get(passageId);
    const newPassage = newPassagesMap.get(passageId);

    if (!oldPassage && newPassage) {
      // Passage added
      passageDiffs.push({
        passageId,
        changeType: 'added',
        newPassage,
      });
      stats.passagesAdded++;
      stats.linesAdded += newPassage.content.split('\n').length;
    } else if (oldPassage && !newPassage) {
      // Passage removed
      passageDiffs.push({
        passageId,
        changeType: 'removed',
        oldPassage,
      });
      stats.passagesRemoved++;
      stats.linesRemoved += oldPassage.content.split('\n').length;
    } else if (oldPassage && newPassage) {
      // Passage exists in both - check for changes
      const contentChanged = oldPassage.content !== newPassage.content;
      const metadataChanges = computeMetadataChanges(oldPassage, newPassage);
      const hasChanges = contentChanged || metadataChanges.length > 0;

      if (hasChanges) {
        const textChanges = contentChanged ? computeTextDiff(oldPassage.content, newPassage.content) : [];

        passageDiffs.push({
          passageId,
          changeType: 'modified',
          oldPassage,
          newPassage,
          textChanges,
          metadataChanges,
        });

        stats.passagesModified++;
        stats.linesAdded += textChanges.filter(c => c.type === 'added').length;
        stats.linesRemoved += textChanges.filter(c => c.type === 'removed').length;
      } else {
        passageDiffs.push({
          passageId,
          changeType: 'unchanged',
          oldPassage,
          newPassage,
        });
        stats.passagesUnchanged++;
      }
    }
  }

  return {
    fromVersion: from,
    toVersion: to,
    passageDiffs,
    stats,
  };
}

// Create version diff store
const createVersionDiffStore = () => {
  const { subscribe, set, update } = writable<VersionDiffState>(DEFAULT_STATE);

  return {
    subscribe,

    /**
     * Create a snapshot of the current story
     */
    createSnapshot: (story: Story, label: string, description: string = '', author?: string) => {
      const snapshot: VersionSnapshot = {
        id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        label,
        description,
        story: JSON.parse(JSON.stringify(story)), // Deep clone
        author,
      };

      update(state => ({
        ...state,
        snapshots: [...state.snapshots, snapshot],
      }));

      return snapshot.id;
    },

    /**
     * Delete a snapshot
     */
    deleteSnapshot: (snapshotId: string) => {
      update(state => ({
        ...state,
        snapshots: state.snapshots.filter(s => s.id !== snapshotId),
        selectedFromVersion: state.selectedFromVersion === snapshotId ? null : state.selectedFromVersion,
        selectedToVersion: state.selectedToVersion === snapshotId ? null : state.selectedToVersion,
        currentDiff: state.selectedFromVersion === snapshotId || state.selectedToVersion === snapshotId
          ? null
          : state.currentDiff,
      }));
    },

    /**
     * Update snapshot label/description
     */
    updateSnapshot: (snapshotId: string, updates: Partial<Pick<VersionSnapshot, 'label' | 'description'>>) => {
      update(state => ({
        ...state,
        snapshots: state.snapshots.map(s =>
          s.id === snapshotId ? { ...s, ...updates } : s
        ),
      }));
    },

    /**
     * Select versions to compare
     */
    selectVersions: (fromId: string, toId: string) => {
      update(state => {
        const fromVersion = state.snapshots.find(s => s.id === fromId);
        const toVersion = state.snapshots.find(s => s.id === toId);

        if (!fromVersion || !toVersion) {
          return state;
        }

        const diff = computeStoryDiff(fromVersion, toVersion);

        return {
          ...state,
          selectedFromVersion: fromId,
          selectedToVersion: toId,
          currentDiff: diff,
        };
      });
    },

    /**
     * Clear current comparison
     */
    clearComparison: () => {
      update(state => ({
        ...state,
        selectedFromVersion: null,
        selectedToVersion: null,
        currentDiff: null,
      }));
    },

    /**
     * Export diff as HTML report
     */
    exportDiffReport: (diff: StoryDiff): string => {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Story Comparison Report</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #333; }
    .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 20px 0; }
    .stat { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 4px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #2563eb; }
    .stat-label { color: #666; font-size: 14px; }
    .passage-diff { border: 1px solid #ddd; margin: 20px 0; border-radius: 4px; overflow: hidden; }
    .passage-header { background: #f9fafb; padding: 10px 15px; border-bottom: 1px solid #ddd; }
    .passage-title { font-weight: bold; margin-right: 10px; }
    .change-badge { padding: 2px 8px; border-radius: 3px; font-size: 12px; }
    .badge-added { background: #dcfce7; color: #166534; }
    .badge-removed { background: #fee2e2; color: #991b1b; }
    .badge-modified { background: #fef3c7; color: #92400e; }
    .diff-content { padding: 15px; }
    .line { font-family: 'Courier New', monospace; font-size: 14px; padding: 2px 5px; }
    .line-added { background: #dcfce7; border-left: 3px solid #16a34a; }
    .line-removed { background: #fee2e2; border-left: 3px solid #dc2626; }
    .line-unchanged { color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Story Comparison Report</h1>
    <p><strong>From:</strong> ${diff.fromVersion.label} (${new Date(diff.fromVersion.timestamp).toLocaleString()})</p>
    <p><strong>To:</strong> ${diff.toVersion.label} (${new Date(diff.toVersion.timestamp).toLocaleString()})</p>
  </div>

  <h2>Summary Statistics</h2>
  <div class="stats">
    <div class="stat">
      <div class="stat-value">${diff.stats.passagesAdded}</div>
      <div class="stat-label">Passages Added</div>
    </div>
    <div class="stat">
      <div class="stat-value">${diff.stats.passagesRemoved}</div>
      <div class="stat-label">Passages Removed</div>
    </div>
    <div class="stat">
      <div class="stat-value">${diff.stats.passagesModified}</div>
      <div class="stat-label">Passages Modified</div>
    </div>
    <div class="stat">
      <div class="stat-value">${diff.stats.linesAdded}</div>
      <div class="stat-label">Lines Added</div>
    </div>
    <div class="stat">
      <div class="stat-value">${diff.stats.linesRemoved}</div>
      <div class="stat-label">Lines Removed</div>
    </div>
  </div>

  <h2>Changes by Passage</h2>
  ${diff.passageDiffs
    .filter(pd => pd.changeType !== 'unchanged')
    .map(pd => {
      const passage = pd.newPassage || pd.oldPassage!;
      return `
    <div class="passage-diff">
      <div class="passage-header">
        <span class="passage-title">${passage.title}</span>
        <span class="change-badge badge-${pd.changeType}">${pd.changeType.toUpperCase()}</span>
      </div>
      <div class="diff-content">
        ${pd.textChanges?.map(tc => `
          <div class="line line-${tc.type}">
            ${tc.type === 'added' ? '+ ' : tc.type === 'removed' ? '- ' : '  '}${tc.value}
          </div>
        `).join('') || ''}
        ${pd.metadataChanges && pd.metadataChanges.length > 0 ? `
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
            <strong>Metadata Changes:</strong>
            <ul>
              ${pd.metadataChanges.map(mc => `
                <li><strong>${mc.field}:</strong> ${JSON.stringify(mc.oldValue)} → ${JSON.stringify(mc.newValue)}</li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    </div>
      `;
    }).join('')}

  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; text-align: center;">
    Generated by Whisker Visual Editor on ${new Date().toLocaleString()}
  </footer>
</body>
</html>
      `.trim();

      return html;
    },

    /**
     * Clear all snapshots
     */
    clearAllSnapshots: () => {
      set(DEFAULT_STATE);
    },
  };
};

export const versionDiffStore = createVersionDiffStore();

// Derived stores
export const snapshots = derived(versionDiffStore, $store => $store.snapshots);
export const currentDiff = derived(versionDiffStore, $store => $store.currentDiff);
export const hasSnapshots = derived(snapshots, $snapshots => $snapshots.length > 0);
