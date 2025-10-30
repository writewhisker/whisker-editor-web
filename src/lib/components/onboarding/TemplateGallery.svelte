<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    selectTemplate: { templateId: string; templateName: string };
    startBlank: void;
    close: void;
  }>();

  interface Template {
    id: string;
    name: string;
    description: string;
    icon: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    category: 'tutorial' | 'adventure' | 'rpg' | 'romance' | 'mystery' | 'dialogue';
    features: string[];
    passages: number;
    estimatedTime: string;
  }

  const templates: Template[] = [
    {
      id: 'hello-world',
      name: 'Hello World',
      description: 'Your first interactive story - learn the basics in under 1 minute',
      icon: '👋',
      difficulty: 'beginner',
      category: 'tutorial',
      features: ['Basic passages', 'Simple choices', 'Markdown formatting'],
      passages: 2,
      estimatedTime: '1 min'
    },
    {
      id: 'the-cave',
      name: 'The Cave',
      description: 'A simple adventure story teaching the basics of Whisker',
      icon: '🏔️',
      difficulty: 'beginner',
      category: 'adventure',
      features: ['Branching paths', 'Multiple endings', 'Choice consequences'],
      passages: 8,
      estimatedTime: '3 min'
    },
    {
      id: 'the-quest',
      name: 'The Quest',
      description: 'A medium-complexity adventure with variables and conditionals',
      icon: '⚔️',
      difficulty: 'intermediate',
      category: 'adventure',
      features: ['Variables', 'Conditionals', 'State management', 'Branching narrative'],
      passages: 15,
      estimatedTime: '5 min'
    },
    {
      id: 'combat-system',
      name: 'Combat System',
      description: 'Advanced RPG mechanics with combat, inventory, and health tracking',
      icon: '⚡',
      difficulty: 'advanced',
      category: 'rpg',
      features: ['Combat mechanics', 'Inventory system', 'Health tracking', 'Complex conditionals'],
      passages: 25,
      estimatedTime: '10 min'
    },
    {
      id: 'visual-novel',
      name: 'Visual Novel',
      description: 'Romance-focused story with character relationships and choices',
      icon: '💕',
      difficulty: 'intermediate',
      category: 'romance',
      features: ['Relationship tracking', 'Multiple romance routes', 'Character development', 'Meaningful choices'],
      passages: 14,
      estimatedTime: '7 min'
    },
    {
      id: 'mystery-investigation',
      name: 'Mystery Investigation',
      description: 'Detective story with clue gathering and deduction mechanics',
      icon: '🔍',
      difficulty: 'advanced',
      category: 'mystery',
      features: ['Clue system', 'Multiple suspects', 'Deduction mechanics', 'Evidence tracking'],
      passages: 20,
      estimatedTime: '12 min'
    },
    {
      id: 'branching-dialogue',
      name: 'Branching Dialogue',
      description: 'Conversation-focused story with personality and reputation systems',
      icon: '💬',
      difficulty: 'advanced',
      category: 'dialogue',
      features: ['Personality tracking', 'Reputation system', 'Consequence-based branching', 'Multiple outcomes'],
      passages: 18,
      estimatedTime: '10 min'
    }
  ];

  let selectedDifficulty = $state<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  let selectedCategory = $state<'all' | Template['category']>('all');

  const filteredTemplates = $derived(
    templates.filter(t => {
      const matchesDifficulty = selectedDifficulty === 'all' || t.difficulty === selectedDifficulty;
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      return matchesDifficulty && matchesCategory;
    })
  );

  function selectTemplate(template: Template) {
    dispatch('selectTemplate', {
      templateId: template.id,
      templateName: template.name
    });
  }

  function startBlank() {
    dispatch('startBlank');
  }

  function getDifficultyColor(difficulty: Template['difficulty']): string {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  }
</script>

<div class="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
    <!-- Header -->
    <div class="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 p-6 text-white">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-3xl font-bold mb-2">Choose Your Starting Point</h2>
          <p class="text-blue-100 dark:text-blue-200">Pick a template to get started, or create from scratch</p>
        </div>
        <button
          onclick={() => dispatch('close')}
          class="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-colors"
          aria-label="Close"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Filters -->
      <div class="flex gap-4 flex-wrap">
        <div class="flex gap-2">
          <button
            onclick={() => selectedDifficulty = 'all'}
            class="px-4 py-2 rounded-lg transition-colors {selectedDifficulty === 'all' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'}"
          >
            All Levels
          </button>
          <button
            onclick={() => selectedDifficulty = 'beginner'}
            class="px-4 py-2 rounded-lg transition-colors {selectedDifficulty === 'beginner' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'}"
          >
            Beginner
          </button>
          <button
            onclick={() => selectedDifficulty = 'intermediate'}
            class="px-4 py-2 rounded-lg transition-colors {selectedDifficulty === 'intermediate' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'}"
          >
            Intermediate
          </button>
          <button
            onclick={() => selectedDifficulty = 'advanced'}
            class="px-4 py-2 rounded-lg transition-colors {selectedDifficulty === 'advanced' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'}"
          >
            Advanced
          </button>
        </div>

        <div class="flex gap-2">
          <button
            onclick={() => selectedCategory = 'all'}
            class="px-4 py-2 rounded-lg transition-colors {selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'}"
          >
            All Types
          </button>
          <button
            onclick={() => selectedCategory = 'adventure'}
            class="px-4 py-2 rounded-lg transition-colors {selectedCategory === 'adventure' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'}"
          >
            Adventure
          </button>
          <button
            onclick={() => selectedCategory = 'rpg'}
            class="px-4 py-2 rounded-lg transition-colors {selectedCategory === 'rpg' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'}"
          >
            RPG
          </button>
        </div>
      </div>
    </div>

    <!-- Templates Grid -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- Blank Story Option -->
      <button
        onclick={startBlank}
        class="w-full mb-6 p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
      >
        <div class="flex items-center gap-4">
          <div class="text-5xl">✨</div>
          <div class="text-left">
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-1">
              Start with Blank Story
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              Create your story from scratch with a clean slate
            </p>
          </div>
        </div>
      </button>

      <!-- Template Cards -->
      {#if filteredTemplates.length === 0}
        <div class="text-center py-12 text-gray-500 dark:text-gray-400">
          <p class="text-lg">No templates match your filters</p>
          <button
            onclick={() => { selectedDifficulty = 'all'; selectedCategory = 'all'; }}
            class="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each filteredTemplates as template}
            <button
              onclick={() => selectTemplate(template)}
              class="group p-5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all text-left"
            >
              <!-- Header -->
              <div class="flex items-start justify-between mb-3">
                <div class="text-4xl">{template.icon}</div>
                <span class="text-xs px-2 py-1 rounded-full {getDifficultyColor(template.difficulty)} font-medium">
                  {template.difficulty}
                </span>
              </div>

              <!-- Title & Description -->
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {template.name}
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                {template.description}
              </p>

              <!-- Features -->
              <div class="mb-3">
                <ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  {#each template.features.slice(0, 3) as feature}
                    <li class="flex items-center gap-1">
                      <svg class="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  {/each}
                </ul>
              </div>

              <!-- Meta Info -->
              <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-600">
                <span>{template.passages} passages</span>
                <span>{template.estimatedTime} read</span>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Footer -->
    <div class="bg-gray-50 dark:bg-gray-900 p-4 border-t border-gray-200 dark:border-gray-700">
      <p class="text-sm text-gray-600 dark:text-gray-400 text-center">
        💡 <strong>Tip:</strong> All templates are fully editable - customize them to build your own unique story
      </p>
    </div>
  </div>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
