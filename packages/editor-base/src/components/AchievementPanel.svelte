<script lang="ts">
  import {
    achievementStore,
    achievements,
    categories,
    totalPoints,
    type AchievementRarity,
    type TriggerType,
  } from '../stores/achievementStore';
  import { currentStory } from '../stores/storyStateStore';

  let viewMode: 'list' | 'edit' | 'code' = $state('list');
  let editingId: string | null = $state(null);
  let formTitle = $state('');
  let formDescription = $state('');
  let formIcon = $state('🏆');
  let formRarity: AchievementRarity = $state('common');
  let formHidden = $state(false);
  let formCategory = $state('Story');
  let formTriggerType: TriggerType = $state('passage_visit');
  let formTriggerPassage = $state('');
  let formTriggerVariable = $state('');
  let formTriggerValue = $state('');
  let formTriggerCondition: 'equals' | 'greater' | 'less' | 'contains' = $state('equals');
  let formTriggerChoice = $state('');
  let formTriggerCount = $state(1);
  let generatedCode = $state<any>(null);
  let copiedSection: string | null = $state(null);

  function startAdd() {
    editingId = null;
    formTitle = '';
    formDescription = '';
    formIcon = '🏆';
    formRarity = 'common';
    formHidden = false;
    formCategory = 'Story';
    formTriggerType = 'passage_visit';
    viewMode = 'edit';
  }

  function startEdit(id: string) {
    const ach = $achievements.find(a => a.id === id);
    if (!ach) return;

    editingId = id;
    formTitle = ach.title;
    formDescription = ach.description;
    formIcon = ach.icon;
    formRarity = ach.rarity;
    formHidden = ach.hidden;
    formCategory = ach.category || 'Story';
    formTriggerType = ach.trigger.type;
    formTriggerPassage = ach.trigger.passageId || '';
    formTriggerVariable = ach.trigger.variableName || '';
    formTriggerValue = String(ach.trigger.variableValue || '');
    formTriggerCondition = ach.trigger.variableCondition || 'equals';
    formTriggerChoice = ach.trigger.choiceId || '';
    formTriggerCount = ach.trigger.count || 1;
    viewMode = 'edit';
  }

  function saveAchievement() {
    if (!formTitle) return;

    const achievement = {
      title: formTitle,
      description: formDescription,
      icon: formIcon,
      rarity: formRarity,
      points: achievementStore.getRarityPoints(formRarity),
      hidden: formHidden,
      category: formCategory,
      trigger: {
        type: formTriggerType,
        ...(formTriggerType === 'passage_visit' || formTriggerType === 'ending_reached' ? { passageId: formTriggerPassage } : {}),
        ...(formTriggerType === 'variable_value' ? {
          variableName: formTriggerVariable,
          variableValue: formTriggerValue,
          variableCondition: formTriggerCondition,
        } : {}),
        ...(formTriggerType === 'choice_made' ? { choiceId: formTriggerChoice } : {}),
        ...(formTriggerType === 'passage_count' ? { count: formTriggerCount } : {}),
      },
    };

    if (editingId) {
      achievementStore.updateAchievement(editingId, achievement);
    } else {
      achievementStore.addAchievement(achievement);
    }

    viewMode = 'list';
  }

  function deleteAchievement(id: string) {
    if (confirm('Delete this achievement?')) {
      achievementStore.deleteAchievement(id);
    }
  }

  function generateCode() {
    generatedCode = achievementStore.generateCode();
    viewMode = 'code';
  }

  async function copyCode(section: string, code: string) {
    try {
      await navigator.clipboard.writeText(code);
      copiedSection = section;
      setTimeout(() => copiedSection = null, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  function downloadCode() {
    if (!generatedCode) return;

    const code = `// Achievement System Code\n\n${generatedCode.types}\n\n${generatedCode.storageCode}\n\n${generatedCode.checkFunction}\n\n${generatedCode.unlockFunction}`;

    const blob = new Blob([code], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'achievements.ts';
    a.click();
    URL.revokeObjectURL(url);
  }

  const rarityColors: Record<AchievementRarity, string> = {
    common: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    uncommon: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    rare: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    epic: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
    legendary: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
  };
</script>

<div class="h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
  <div class="p-4 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        🏆 Achievements
      </h2>
      <div class="flex gap-2">
        {#if viewMode === 'list'}
          <button
            onclick={startAdd}
            class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium"
          >
            + Add
          </button>
          <button
            onclick={generateCode}
            disabled={$achievements.length === 0}
            class="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm font-medium"
          >
            Generate Code
          </button>
        {:else if viewMode === 'edit'}
          <button
            onclick={() => viewMode = 'list'}
            class="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onclick={saveAchievement}
            disabled={!formTitle}
            class="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded text-sm font-medium"
          >
            Save
          </button>
        {:else if viewMode === 'code'}
          <button
            onclick={() => viewMode = 'list'}
            class="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium"
          >
            Back
          </button>
          <button
            onclick={downloadCode}
            class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
          >
            Download
          </button>
        {/if}
      </div>
    </div>

    {#if viewMode === 'list'}
      <div class="text-xs text-gray-600 dark:text-gray-400">
        {$achievements.length} achievements · {$totalPoints} total points
      </div>
    {/if}
  </div>

  <div class="flex-1 overflow-y-auto p-4">
    {#if viewMode === 'list'}
      {#if $achievements.length === 0}
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p class="text-sm">No achievements yet. Click "+ Add" to create one.</p>
        </div>
      {:else}
        <div class="space-y-2">
          {#each $achievements as achievement}
            <div class="p-3 border border-gray-200 dark:border-gray-700 rounded">
              <div class="flex items-start gap-3">
                <div class="text-2xl">{achievement.icon}</div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <div class="font-medium text-gray-900 dark:text-gray-100">{achievement.title}</div>
                    <span class="px-2 py-0.5 text-xs rounded {rarityColors[achievement.rarity]}">
                      {achievement.rarity}
                    </span>
                    {#if achievement.hidden}
                      <span class="text-xs text-gray-500">🔒 Hidden</span>
                    {/if}
                  </div>
                  <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">{achievement.description}</div>
                  <div class="text-xs text-gray-500">
                    {achievement.points} points · {achievement.trigger.type}
                  </div>
                </div>
                <div class="flex gap-1">
                  <button
                    onclick={() => startEdit(achievement.id)}
                    class="px-2 py-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onclick={() => deleteAchievement(achievement.id)}
                    class="px-2 py-1 text-xs text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {:else if viewMode === 'edit'}
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium mb-1">Title *</label>
          <input
            type="text"
            bind:value={formTitle}
            placeholder="First Steps"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Description</label>
          <textarea
            bind:value={formDescription}
            placeholder="Complete your first passage"
            rows="2"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">Icon</label>
            <input
              type="text"
              bind:value={formIcon}
              placeholder="🏆"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Rarity</label>
            <select
              bind:value={formRarity}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
            >
              <option value="common">Common (10 pts)</option>
              <option value="uncommon">Uncommon (25 pts)</option>
              <option value="rare">Rare (50 pts)</option>
              <option value="epic">Epic (100 pts)</option>
              <option value="legendary">Legendary (250 pts)</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Category</label>
          <select
            bind:value={formCategory}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
          >
            {#each $categories as cat}
              <option value={cat}>{cat}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" bind:checked={formHidden} class="rounded" />
            Hidden until unlocked
          </label>
        </div>

        <div class="pt-3 border-t border-gray-200 dark:border-gray-700">
          <label class="block text-sm font-medium mb-2">Unlock Trigger</label>

          <select
            bind:value={formTriggerType}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm mb-3"
          >
            <option value="passage_visit">Visit Passage</option>
            <option value="variable_value">Variable Value</option>
            <option value="choice_made">Make Choice</option>
            <option value="passage_count">Visit X Passages</option>
            <option value="ending_reached">Reach Ending</option>
          </select>

          {#if formTriggerType === 'passage_visit' || formTriggerType === 'ending_reached'}
            <input
              type="text"
              bind:value={formTriggerPassage}
              placeholder="Passage ID"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
            />
          {:else if formTriggerType === 'variable_value'}
            <div class="space-y-2">
              <input
                type="text"
                bind:value={formTriggerVariable}
                placeholder="Variable name"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
              />
              <select
                bind:value={formTriggerCondition}
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
              >
                <option value="equals">Equals</option>
                <option value="greater">Greater than</option>
                <option value="less">Less than</option>
                <option value="contains">Contains</option>
              </select>
              <input
                type="text"
                bind:value={formTriggerValue}
                placeholder="Value"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
              />
            </div>
          {:else if formTriggerType === 'choice_made'}
            <input
              type="text"
              bind:value={formTriggerChoice}
              placeholder="Choice ID"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
            />
          {:else if formTriggerType === 'passage_count'}
            <input
              type="number"
              bind:value={formTriggerCount}
              min="1"
              placeholder="Number of passages"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
            />
          {/if}
        </div>
      </div>
    {:else if viewMode === 'code' && generatedCode}
      <div class="space-y-3">
        <div class="border border-gray-200 dark:border-gray-700 rounded">
          <div class="flex justify-between p-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div class="text-sm font-medium">Types</div>
            <button onclick={() => copyCode('types', generatedCode.types)} class="text-xs text-blue-600">
              {copiedSection === 'types' ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          <pre class="p-3 text-xs overflow-x-auto"><code>{generatedCode.types}</code></pre>
        </div>

        <div class="border border-gray-200 dark:border-gray-700 rounded">
          <div class="flex justify-between p-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div class="text-sm font-medium">Storage & Definitions</div>
            <button onclick={() => copyCode('storage', generatedCode.storageCode)} class="text-xs text-blue-600">
              {copiedSection === 'storage' ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          <pre class="p-3 text-xs overflow-x-auto"><code>{generatedCode.storageCode}</code></pre>
        </div>

        <div class="border border-gray-200 dark:border-gray-700 rounded">
          <div class="flex justify-between p-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div class="text-sm font-medium">Check Function</div>
            <button onclick={() => copyCode('check', generatedCode.checkFunction)} class="text-xs text-blue-600">
              {copiedSection === 'check' ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          <pre class="p-3 text-xs overflow-x-auto"><code>{generatedCode.checkFunction}</code></pre>
        </div>

        <div class="border border-gray-200 dark:border-gray-700 rounded">
          <div class="flex justify-between p-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div class="text-sm font-medium">Unlock Function</div>
            <button onclick={() => copyCode('unlock', generatedCode.unlockFunction)} class="text-xs text-blue-600">
              {copiedSection === 'unlock' ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          <pre class="p-3 text-xs overflow-x-auto"><code>{generatedCode.unlockFunction}</code></pre>
        </div>
      </div>
    {/if}
  </div>
</div>
