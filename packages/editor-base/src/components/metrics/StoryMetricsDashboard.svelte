<script lang="ts">
  import { currentStory } from '../../stores/storyStateStore';
  import { derived } from 'svelte/store';
  import type { Passage } from '@whisker/core-ts';

  interface StoryMetrics {
    content: {
      totalPassages: number;
      totalWords: number;
      totalChoices: number;
      avgWordsPerPassage: number;
      avgChoicesPerPassage: number;
      longestPassage: { title: string; words: number } | null;
      shortestPassage: { title: string; words: number } | null;
    };
    structure: {
      startPassageSet: boolean;
      deadEnds: number;
      passagesWithNoChoices: number;
      passagesWithManyChoices: number; // >5 choices
      maxDepth: number;
      circularReferences: number;
    };
    tags: {
      totalTags: number;
      mostUsedTags: { tag: string; count: number }[];
      untaggedPassages: number;
    };
    variables: {
      totalVariables: number;
      unusedVariables: number;
    };
    readability: {
      estimatedPlaytime: string; // in minutes
      complexity: 'Simple' | 'Moderate' | 'Complex' | 'Very Complex';
    };
  }

  const metrics = derived(currentStory, ($story) => {
    if (!$story) return null;

    const passages = Array.from($story.passages.values() as Iterable<Passage>);

    // Content Metrics
    const passageWords = passages.map(p => ({
      title: p.title,
      words: p.content.trim().split(/\s+/).filter(w => w.length > 0).length
    }));

    const totalWords = passageWords.reduce((sum, p) => sum + p.words, 0);
    const totalChoices = passages.reduce((sum, p) => sum + p.choices.length, 0);

    const longestPassage = passageWords.length > 0
      ? passageWords.reduce((max, p) => p.words > max.words ? p : max)
      : null;

    const shortestPassage = passageWords.length > 0
      ? passageWords.reduce((min, p) => p.words < min.words ? p : min)
      : null;

    // Structure Metrics
    const deadEnds = passages.filter(p => p.choices.length === 0).length;
    const passagesWithManyChoices = passages.filter(p => p.choices.length > 5).length;

    // Tag Metrics
    const tagCounts = new Map<string, number>();
    passages.forEach(p => {
      if (p.tags && p.tags.length > 0) {
        p.tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      }
    });

    const mostUsedTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const untaggedPassages = passages.filter(p => !p.tags || p.tags.length === 0).length;

    // Variable Metrics
    const totalVariables = $story.variables ? $story.variables.size : 0;

    // Readability Metrics
    const avgWordsPerMinute = 200;
    const estimatedMinutes = Math.ceil(totalWords / avgWordsPerMinute);
    const estimatedPlaytime = estimatedMinutes < 60
      ? `${estimatedMinutes} min`
      : `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`;

    const avgChoicesPerPassage = passages.length > 0 ? totalChoices / passages.length : 0;
    let complexity: 'Simple' | 'Moderate' | 'Complex' | 'Very Complex';
    if (passages.length < 10 && avgChoicesPerPassage < 2) {
      complexity = 'Simple';
    } else if (passages.length < 30 && avgChoicesPerPassage < 3) {
      complexity = 'Moderate';
    } else if (passages.length < 100) {
      complexity = 'Complex';
    } else {
      complexity = 'Very Complex';
    }

    const result: StoryMetrics = {
      content: {
        totalPassages: passages.length,
        totalWords,
        totalChoices,
        avgWordsPerPassage: passages.length > 0 ? totalWords / passages.length : 0,
        avgChoicesPerPassage,
        longestPassage,
        shortestPassage,
      },
      structure: {
        startPassageSet: !!$story.startPassage,
        deadEnds,
        passagesWithNoChoices: deadEnds,
        passagesWithManyChoices,
        maxDepth: 0, // Would need graph traversal
        circularReferences: 0, // Would need graph analysis
      },
      tags: {
        totalTags: tagCounts.size,
        mostUsedTags,
        untaggedPassages,
      },
      variables: {
        totalVariables,
        unusedVariables: 0, // Would need usage analysis
      },
      readability: {
        estimatedPlaytime,
        complexity,
      },
    };

    return result;
  });

  let selectedSection: 'content' | 'structure' | 'tags' | 'readability' = $state('content');
</script>

<div class="metrics-dashboard">
  <div class="dashboard-header">
    <h2>Story Metrics Dashboard</h2>
    <p class="subtitle">Comprehensive analytics for your interactive story</p>
  </div>

  {#if !$currentStory}
    <div class="empty-state">
      <p>No story loaded</p>
      <p class="hint">Open or create a story to see metrics</p>
    </div>
  {:else if $metrics}
    <div class="tabs">
      <button
        class:active={selectedSection === 'content'}
        onclick={() => selectedSection = 'content'}
      >
        Content
      </button>
      <button
        class:active={selectedSection === 'structure'}
        onclick={() => selectedSection = 'structure'}
      >
        Structure
      </button>
      <button
        class:active={selectedSection === 'tags'}
        onclick={() => selectedSection = 'tags'}
      >
        Tags
      </button>
      <button
        class:active={selectedSection === 'readability'}
        onclick={() => selectedSection = 'readability'}
      >
        Readability
      </button>
    </div>

    <div class="dashboard-content">
      {#if selectedSection === 'content'}
        <div class="metrics-grid">
          <div class="metric-card primary">
            <div class="metric-icon">📄</div>
            <div class="metric-info">
              <div class="metric-value">{$metrics.content.totalPassages}</div>
              <div class="metric-label">Total Passages</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">✍️</div>
            <div class="metric-info">
              <div class="metric-value">{$metrics.content.totalWords.toLocaleString()}</div>
              <div class="metric-label">Total Words</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">🔀</div>
            <div class="metric-info">
              <div class="metric-value">{$metrics.content.totalChoices}</div>
              <div class="metric-label">Total Choices</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">📊</div>
            <div class="metric-info">
              <div class="metric-value">{$metrics.content.avgWordsPerPassage.toFixed(1)}</div>
              <div class="metric-label">Avg Words/Passage</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">🎯</div>
            <div class="metric-info">
              <div class="metric-value">{$metrics.content.avgChoicesPerPassage.toFixed(1)}</div>
              <div class="metric-label">Avg Choices/Passage</div>
            </div>
          </div>
        </div>

        <div class="details-section">
          <h3>Passage Details</h3>
          {#if $metrics.content.longestPassage}
            <div class="detail-item">
              <span class="detail-label">Longest Passage:</span>
              <span class="detail-value">{$metrics.content.longestPassage.title} ({$metrics.content.longestPassage.words} words)</span>
            </div>
          {/if}
          {#if $metrics.content.shortestPassage}
            <div class="detail-item">
              <span class="detail-label">Shortest Passage:</span>
              <span class="detail-value">{$metrics.content.shortestPassage.title} ({$metrics.content.shortestPassage.words} words)</span>
            </div>
          {/if}
        </div>
      {:else if selectedSection === 'structure'}
        <div class="metrics-grid">
          <div class="metric-card" class:warning={!$metrics.structure.startPassageSet}>
            <div class="metric-icon">{$metrics.structure.startPassageSet ? '✅' : '⚠️'}</div>
            <div class="metric-info">
              <div class="metric-value">{$metrics.structure.startPassageSet ? 'Set' : 'Not Set'}</div>
              <div class="metric-label">Start Passage</div>
            </div>
          </div>

          <div class="metric-card" class:warning={$metrics.structure.deadEnds > 0}>
            <div class="metric-icon">🔚</div>
            <div class="metric-info">
              <div class="metric-value">{$metrics.structure.deadEnds}</div>
              <div class="metric-label">Dead Ends</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">🌳</div>
            <div class="metric-info">
              <div class="metric-value">{$metrics.structure.passagesWithManyChoices}</div>
              <div class="metric-label">Branching Points</div>
            </div>
          </div>
        </div>

        <div class="info-box">
          <p><strong>Dead Ends:</strong> Passages with no outgoing choices. These are typically story endings.</p>
          <p><strong>Branching Points:</strong> Passages with more than 5 choices, offering significant player agency.</p>
        </div>
      {:else if selectedSection === 'tags'}
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon">🏷️</div>
            <div class="metric-info">
              <div class="metric-value">{$metrics.tags.totalTags}</div>
              <div class="metric-label">Unique Tags</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">📝</div>
            <div class="metric-info">
              <div class="metric-value">{$metrics.tags.untaggedPassages}</div>
              <div class="metric-label">Untagged Passages</div>
            </div>
          </div>
        </div>

        {#if $metrics.tags.mostUsedTags.length > 0}
          <div class="details-section">
            <h3>Most Used Tags</h3>
            <div class="tag-list">
              {#each $metrics.tags.mostUsedTags as { tag, count }}
                <div class="tag-item">
                  <span class="tag-name">{tag}</span>
                  <span class="tag-count">{count} passage{count !== 1 ? 's' : ''}</span>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="info-box">
            <p>No tags have been added to your passages yet.</p>
          </div>
        {/if}
      {:else if selectedSection === 'readability'}
        <div class="metrics-grid">
          <div class="metric-card primary">
            <div class="metric-icon">⏱️</div>
            <div class="metric-info">
              <div class="metric-value">{$metrics.readability.estimatedPlaytime}</div>
              <div class="metric-label">Est. Playtime</div>
            </div>
          </div>

          <div class="metric-card" class:success={$metrics.readability.complexity === 'Simple' || $metrics.readability.complexity === 'Moderate'}>
            <div class="metric-icon">🎮</div>
            <div class="metric-info">
              <div class="metric-value">{$metrics.readability.complexity}</div>
              <div class="metric-label">Complexity</div>
            </div>
          </div>
        </div>

        <div class="info-box">
          <p><strong>Estimated Playtime:</strong> Based on average reading speed of 200 words per minute.</p>
          <p><strong>Complexity:</strong> Determined by passage count and average branching factor.</p>
          <ul>
            <li><strong>Simple:</strong> &lt;10 passages, &lt;2 avg choices</li>
            <li><strong>Moderate:</strong> &lt;30 passages, &lt;3 avg choices</li>
            <li><strong>Complex:</strong> &lt;100 passages</li>
            <li><strong>Very Complex:</strong> 100+ passages</li>
          </ul>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .metrics-dashboard {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .dashboard-header {
    padding: 20px;
    border-bottom: 1px solid #e2e8f0;
  }

  .dashboard-header h2 {
    margin: 0 0 4px 0;
    font-size: 20px;
    font-weight: 600;
    color: #1e293b;
  }

  .subtitle {
    margin: 0;
    font-size: 14px;
    color: #64748b;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #64748b;
    text-align: center;
  }

  .empty-state p {
    margin: 0 0 8px 0;
  }

  .hint {
    font-size: 14px;
    opacity: 0.8;
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid #e2e8f0;
    padding: 0 20px;
  }

  .tabs button {
    padding: 12px 20px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: #64748b;
    transition: all 0.2s;
  }

  .tabs button:hover {
    color: #1e293b;
  }

  .tabs button.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }

  .dashboard-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .metric-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .metric-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .metric-card.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
  }

  .metric-card.warning {
    background: #fef3c7;
    border-color: #fde047;
  }

  .metric-card.success {
    background: #d1fae5;
    border-color: #86efac;
  }

  .metric-icon {
    font-size: 32px;
  }

  .metric-info {
    flex: 1;
  }

  .metric-value {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .metric-card.primary .metric-value {
    color: white;
  }

  .metric-label {
    font-size: 12px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .metric-card.primary .metric-label {
    color: rgba(255, 255, 255, 0.9);
  }

  .details-section {
    margin-top: 24px;
    padding: 20px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
  }

  .details-section h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #e2e8f0;
  }

  .detail-item:last-child {
    border-bottom: none;
  }

  .detail-label {
    font-weight: 500;
    color: #64748b;
  }

  .detail-value {
    color: #1e293b;
  }

  .info-box {
    margin-top: 24px;
    padding: 16px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    color: #1e40af;
    font-size: 14px;
    line-height: 1.6;
  }

  .info-box p {
    margin: 0 0 12px 0;
  }

  .info-box p:last-child {
    margin-bottom: 0;
  }

  .info-box ul {
    margin: 8px 0 0 20px;
    padding: 0;
  }

  .info-box li {
    margin: 4px 0;
  }

  .tag-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .tag-item {
    display: flex;
    justify-content: space-between;
    padding: 10px 12px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
  }

  .tag-name {
    font-weight: 500;
    color: #1e293b;
  }

  .tag-count {
    color: #64748b;
    font-size: 14px;
  }
</style>
