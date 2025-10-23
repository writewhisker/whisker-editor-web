<script lang="ts">
  import { currentStory, passageList, variableList } from '../stores/projectStore';
  import { validationResult } from '../stores/validationStore';
  import { isOrphanPassage, isDeadEndPassage } from '../stores/filterStore';
  import { derived } from 'svelte/store';
  import type { Passage } from '../models/Passage';

  // Comprehensive story statistics
  const stats = derived([currentStory, passageList, validationResult], ([$story, $passages, $validation]) => {
    if (!$story || $passages.length === 0) return null;

    // Word counts
    const passageWordCounts = $passages.map(p => ({
      passage: p,
      wordCount: p.content.trim().split(/\s+/).filter(w => w.length > 0).length
    }));

    const totalWords = passageWordCounts.reduce((sum, p) => sum + p.wordCount, 0);
    const averageWords = Math.round(totalWords / $passages.length);

    // Find longest and shortest passages
    const sorted = [...passageWordCounts].sort((a, b) => b.wordCount - a.wordCount);
    const longestPassage = sorted[0];
    const shortestPassage = sorted[sorted.length - 1];

    // Choice statistics
    const totalChoices = $passages.reduce((sum, p) => sum + p.choices.length, 0);
    const averageChoices = (totalChoices / $passages.length).toFixed(1);
    const maxChoices = Math.max(...$passages.map(p => p.choices.length), 0);

    // Find passage with most choices
    const passageWithMostChoices = $passages.reduce((max, p) =>
      p.choices.length > max.choices.length ? p : max
    , $passages[0]);

    // Connection statistics (incoming links)
    const incomingLinks = new Map<string, number>();
    $passages.forEach(p => {
      incomingLinks.set(p.id, 0);
    });

    $passages.forEach(p => {
      p.choices.forEach(c => {
        if (c.target) {
          const targetPassage = $story.passages.get(c.target);
          if (targetPassage) {
            incomingLinks.set(c.target, (incomingLinks.get(c.target) || 0) + 1);
          }
        }
      });
    });

    const mostConnectedPassage = $passages.reduce((max, p) => {
      const links = incomingLinks.get(p.id) || 0;
      const maxLinks = incomingLinks.get(max.id) || 0;
      return links > maxLinks ? p : max;
    }, $passages[0]);
    const mostConnections = incomingLinks.get(mostConnectedPassage.id) || 0;

    // Story structure
    const deadEndPassages = $passages.filter(p => isDeadEndPassage(p, $story)).length;
    const orphanedPassages = $passages.filter(p => isOrphanPassage(p, $story)).length;
    const startPassage = $story.startPassage ? $story.getPassage($story.startPassage) : null;

    // Tag statistics
    const allTags = new Set<string>();
    $passages.forEach(p => {
      p.tags.forEach(tag => allTags.add(tag));
    });
    const uniqueTags = allTags.size;
    const avgTagsPerPassage = ($passages.reduce((sum, p) => sum + p.tags.length, 0) / $passages.length).toFixed(1);

    // Validation statistics
    let validationStats = { errors: 0, warnings: 0, info: 0 };
    if ($validation) {
      validationStats.errors = $validation.issues.filter(i => i.severity === 'error').length;
      validationStats.warnings = $validation.issues.filter(i => i.severity === 'warning').length;
      validationStats.info = $validation.issues.filter(i => i.severity === 'info').length;
    }

    // Story complexity score (simple heuristic)
    const complexityScore = Math.min(100, Math.round(
      ($passages.length * 2) +
      (totalChoices * 3) +
      (uniqueTags * 5) +
      ($validation ? validationStats.errors * -10 : 0)
    ));

    return {
      overview: {
        passages: $passages.length,
        totalWords,
        averageWords,
        totalChoices,
        variables: $story.variables.size,
      },
      content: {
        longestPassage: {
          title: longestPassage.passage.title,
          words: longestPassage.wordCount,
        },
        shortestPassage: {
          title: shortestPassage.passage.title,
          words: shortestPassage.wordCount,
        },
        averageChoices,
        maxChoices,
        passageWithMostChoices: {
          title: passageWithMostChoices.title,
          count: passageWithMostChoices.choices.length,
        },
      },
      structure: {
        deadEnds: deadEndPassages,
        orphaned: orphanedPassages,
        startPassage: startPassage ? startPassage.title : 'None',
        mostConnected: {
          title: mostConnectedPassage.title,
          connections: mostConnections,
        },
      },
      tags: {
        unique: uniqueTags,
        averagePerPassage: avgTagsPerPassage,
      },
      validation: validationStats,
      complexity: complexityScore,
    };
  });
</script>

<div class="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-300 dark:border-gray-700">
  <!-- Header -->
  <div class="p-3 border-b border-gray-300 dark:border-gray-700">
    <h3 class="font-semibold text-gray-800 dark:text-gray-100">Story Statistics</h3>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4 space-y-6">
    {#if !$currentStory}
      <div class="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
        <div class="text-center">
          <div class="text-4xl mb-2">📊</div>
          <div>No story loaded</div>
        </div>
      </div>
    {:else if $stats}
      <!-- Overview Section -->
      <section>
        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <span class="text-blue-500">📈</span>
          Overview
        </h4>
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
            <div class="text-xs text-gray-600 dark:text-gray-400">Passages</div>
            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{$stats.overview.passages}</div>
          </div>
          <div class="bg-green-50 dark:bg-green-900/20 rounded p-3">
            <div class="text-xs text-gray-600 dark:text-gray-400">Total Words</div>
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">{$stats.overview.totalWords.toLocaleString()}</div>
          </div>
          <div class="bg-purple-50 dark:bg-purple-900/20 rounded p-3">
            <div class="text-xs text-gray-600 dark:text-gray-400">Avg Words/Passage</div>
            <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">{$stats.overview.averageWords}</div>
          </div>
          <div class="bg-orange-50 dark:bg-orange-900/20 rounded p-3">
            <div class="text-xs text-gray-600 dark:text-gray-400">Total Choices</div>
            <div class="text-2xl font-bold text-orange-600 dark:text-orange-400">{$stats.overview.totalChoices}</div>
          </div>
          <div class="bg-indigo-50 dark:bg-indigo-900/20 rounded p-3">
            <div class="text-xs text-gray-600 dark:text-gray-400">Variables</div>
            <div class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{$stats.overview.variables}</div>
          </div>
          <div class="bg-pink-50 dark:bg-pink-900/20 rounded p-3">
            <div class="text-xs text-gray-600 dark:text-gray-400">Unique Tags</div>
            <div class="text-2xl font-bold text-pink-600 dark:text-pink-400">{$stats.tags.unique}</div>
          </div>
        </div>
      </section>

      <!-- Content Analysis Section -->
      <section>
        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <span class="text-green-500">📝</span>
          Content Analysis
        </h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <span class="text-gray-600 dark:text-gray-400">Longest Passage:</span>
            <div class="text-right">
              <div class="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[150px]">
                {$stats.content.longestPassage.title}
              </div>
              <div class="text-xs text-gray-500">{$stats.content.longestPassage.words} words</div>
            </div>
          </div>
          <div class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <span class="text-gray-600 dark:text-gray-400">Shortest Passage:</span>
            <div class="text-right">
              <div class="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[150px]">
                {$stats.content.shortestPassage.title}
              </div>
              <div class="text-xs text-gray-500">{$stats.content.shortestPassage.words} words</div>
            </div>
          </div>
          <div class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <span class="text-gray-600 dark:text-gray-400">Avg Choices/Passage:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">{$stats.content.averageChoices}</span>
          </div>
          <div class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <span class="text-gray-600 dark:text-gray-400">Most Choices:</span>
            <div class="text-right">
              <div class="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[150px]">
                {$stats.content.passageWithMostChoices.title}
              </div>
              <div class="text-xs text-gray-500">{$stats.content.passageWithMostChoices.count} choices</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Story Structure Section -->
      <section>
        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <span class="text-purple-500">🔗</span>
          Story Structure
        </h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <span class="text-gray-600 dark:text-gray-400">Start Passage:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[150px]">
              {$stats.structure.startPassage}
            </span>
          </div>
          <div class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <span class="text-gray-600 dark:text-gray-400">Dead Ends:</span>
            <span class="font-semibold {$stats.structure.deadEnds > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-gray-100'}">
              {$stats.structure.deadEnds}
            </span>
          </div>
          <div class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <span class="text-gray-600 dark:text-gray-400">Orphaned:</span>
            <span class="font-semibold {$stats.structure.orphaned > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-gray-100'}">
              {$stats.structure.orphaned}
            </span>
          </div>
          <div class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <span class="text-gray-600 dark:text-gray-400">Most Connected:</span>
            <div class="text-right">
              <div class="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[150px]">
                {$stats.structure.mostConnected.title}
              </div>
              <div class="text-xs text-gray-500">{$stats.structure.mostConnected.connections} incoming</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Validation Section -->
      <section>
        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <span class="text-red-500">🔍</span>
          Validation
        </h4>
        <div class="grid grid-cols-3 gap-2">
          <div class="bg-red-50 dark:bg-red-900/20 rounded p-3 text-center">
            <div class="text-2xl font-bold text-red-600 dark:text-red-400">{$stats.validation.errors}</div>
            <div class="text-xs text-gray-600 dark:text-gray-400">Errors</div>
          </div>
          <div class="bg-yellow-50 dark:bg-yellow-900/20 rounded p-3 text-center">
            <div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{$stats.validation.warnings}</div>
            <div class="text-xs text-gray-600 dark:text-gray-400">Warnings</div>
          </div>
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded p-3 text-center">
            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{$stats.validation.info}</div>
            <div class="text-xs text-gray-600 dark:text-gray-400">Info</div>
          </div>
        </div>
      </section>

      <!-- Complexity Score Section -->
      <section>
        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <span class="text-indigo-500">⚡</span>
          Complexity Score
        </h4>
        <div class="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{$stats.complexity}</span>
            <span class="text-sm text-gray-600 dark:text-gray-400">/ 100</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              class="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style="width: {$stats.complexity}%"
            ></div>
          </div>
          <div class="mt-2 text-xs text-gray-600 dark:text-gray-400">
            Based on passages, choices, tags, and validation
          </div>
        </div>
      </section>
    {/if}
  </div>
</div>
