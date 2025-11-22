<script lang="ts">
  /**
   * Age Group Selector
   *
   * Shown during first launch of kids mode to select the child's age group.
   * This personalizes the experience and sets appropriate feature restrictions.
   */

  import { createEventDispatcher } from 'svelte';
  import type { AgeGroup } from '../../stores/kidsModeStore';
  import { kidsModeActions } from '../../stores/kidsModeStore';
  import { getFeaturesForAge } from '../../stores/ageGroupFeatures';
  import { parentalControlsActions } from '../../stores/parentalControlsStore';

  export let show = false;

  let selectedAge: AgeGroup | null = null;
  let childName = '';
  let currentStep: 'welcome' | 'age' | 'name' | 'confirm' = 'welcome';

  const dispatch = createEventDispatcher<{
    complete: { ageGroup: AgeGroup; name: string };
  }>();

  const ageGroups: Array<{
    value: AgeGroup;
    label: string;
    emoji: string;
    description: string;
  }> = [
    {
      value: '8-10',
      label: 'Ages 8-10',
      emoji: '🌟',
      description: 'Perfect for younger storytellers! Simple and fun.',
    },
    {
      value: '10-13',
      label: 'Ages 10-13',
      emoji: '🎨',
      description: 'Great for creative minds! More tools and options.',
    },
    {
      value: '13-15',
      label: 'Ages 13-15',
      emoji: '🚀',
      description: 'For advanced creators! Unlock all features.',
    },
  ];

  function handleAgeSelect(age: AgeGroup) {
    selectedAge = age;
    currentStep = 'name';
  }

  function handleComplete() {
    if (selectedAge && childName.trim()) {
      kidsModeActions.setAgeGroup(selectedAge);
      kidsModeActions.setChildName(childName.trim());

      // Apply age-appropriate parental control defaults
      parentalControlsActions.applyAgeDefaults(selectedAge);

      dispatch('complete', { ageGroup: selectedAge, name: childName.trim() });
      show = false;
    }
  }

  function handleSkipName() {
    if (selectedAge) {
      childName = 'Creator';
      handleComplete();
    }
  }

  $: features = selectedAge ? getFeaturesForAge(selectedAge) : null;
</script>

{#if show}
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="age-selector-title"
  >
    <div class="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-8 transform transition-all">
      {#if currentStep === 'welcome'}
        <!-- Welcome Screen -->
        <div class="text-center">
          <div class="text-9xl mb-6 animate-bounce">👋</div>
          <h2 id="age-selector-title" class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 mb-4">
            Welcome to Story Creator!
          </h2>
          <p class="text-2xl text-gray-700 mb-8 font-semibold">
            Let's set up your perfect storytelling experience!
          </p>
          <button
            type="button"
            class="px-12 py-6 rounded-3xl text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-2xl transform hover:scale-110 transition-all"
            on:click={() => currentStep = 'age'}
          >
            Let's Get Started! 🎉
          </button>
        </div>

      {:else if currentStep === 'age'}
        <!-- Age Selection -->
        <div class="text-center mb-8">
          <div class="text-7xl mb-4">🎂</div>
          <h2 class="text-5xl font-black text-gray-800 mb-3">How old are you?</h2>
          <p class="text-xl text-gray-600 font-semibold">
            This helps us make the perfect experience for you!
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {#each ageGroups as group}
            <button
              type="button"
              class="relative bg-gradient-to-br from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 rounded-2xl p-6 border-4 transition-all transform hover:scale-105 {selectedAge === group.value ? 'border-purple-600 ring-4 ring-purple-300' : 'border-purple-300'}"
              on:click={() => handleAgeSelect(group.value)}
            >
              {#if selectedAge === group.value}
                <div class="absolute top-2 right-2 bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-black">
                  ✓
                </div>
              {/if}
              <div class="text-6xl mb-4">{group.emoji}</div>
              <h3 class="text-2xl font-black text-purple-900 mb-2">{group.label}</h3>
              <p class="text-purple-700 font-bold text-sm">{group.description}</p>
            </button>
          {/each}
        </div>

        {#if selectedAge}
          <!-- Show what they'll get -->
          <div class="bg-blue-50 rounded-2xl p-6 border-4 border-blue-300 mb-6">
            <h4 class="text-xl font-black text-blue-900 mb-3">What you'll get:</h4>
            <ul class="space-y-2 text-blue-800 font-bold">
              {#if features}
                <li>✓ Up to {features.maxPassages || 'unlimited'} story pages</li>
                <li>✓ {features.allowVariables ? 'Variables and game items' : 'Simple storytelling tools'}</li>
                <li>✓ {features.templateComplexity === 'beginner' ? 'Beginner' : features.templateComplexity === 'intermediate' ? 'Intermediate' : 'All'} templates</li>
                <li>✓ {features.uiComplexity === 'simple' ? 'Super simple' : features.uiComplexity === 'moderate' ? 'Easy to use' : 'Advanced'} interface</li>
              {/if}
            </ul>
          </div>
        {/if}

        <div class="flex gap-4">
          <button
            type="button"
            class="px-8 py-4 rounded-2xl text-lg font-black bg-gray-200 text-gray-700 hover:bg-gray-300 transform hover:scale-105 transition-all"
            on:click={() => currentStep = 'welcome'}
          >
            ← Back
          </button>
          {#if selectedAge}
            <button
              type="button"
              class="flex-1 px-8 py-4 rounded-2xl text-2xl font-black bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-xl hover:scale-105 transform transition-all"
              on:click={() => currentStep = 'name'}
            >
              Continue →
            </button>
          {/if}
        </div>

      {:else if currentStep === 'name'}
        <!-- Name Input -->
        <div class="text-center mb-8">
          <div class="text-7xl mb-4">✏️</div>
          <h2 class="text-5xl font-black text-gray-800 mb-3">What should we call you?</h2>
          <p class="text-xl text-gray-600 font-semibold">
            We'll use this to make things more personal!
          </p>
        </div>

        <div class="mb-8">
          <input
            type="text"
            bind:value={childName}
            placeholder="Enter your name..."
            class="w-full px-6 py-5 text-3xl rounded-2xl border-4 border-purple-300 focus:border-purple-600 focus:outline-none text-center font-bold"
            maxlength="20"
            on:keydown={(e) => e.key === 'Enter' && childName.trim() && handleComplete()}
          />
          <p class="text-gray-500 text-sm mt-2 text-center font-semibold">
            This stays private and secure on your computer!
          </p>
        </div>

        <div class="flex gap-4">
          <button
            type="button"
            class="px-8 py-4 rounded-2xl text-lg font-black bg-gray-200 text-gray-700 hover:bg-gray-300 transform hover:scale-105 transition-all"
            on:click={() => currentStep = 'age'}
          >
            ← Back
          </button>
          <button
            type="button"
            class="px-8 py-4 rounded-2xl text-lg font-black bg-gray-300 text-gray-700 hover:bg-gray-400 transform hover:scale-105 transition-all"
            on:click={handleSkipName}
          >
            Skip
          </button>
          <button
            type="button"
            class="flex-1 px-8 py-4 rounded-2xl text-2xl font-black bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-xl hover:scale-105 transform transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            on:click={handleComplete}
            disabled={!childName.trim()}
          >
            All Done! 🎉
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-20px);
    }
  }

  .animate-bounce {
    animation: bounce 2s infinite;
  }
</style>
