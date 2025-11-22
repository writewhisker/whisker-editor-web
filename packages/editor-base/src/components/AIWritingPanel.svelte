<script lang="ts">
  import { aiWritingStore, isAILoading, lastAIResponse, aiError, aiHistory } from '../stores/aiWritingStore';
  import type { AssistanceType, AIProvider } from '../stores/aiWritingStore';

  let selectedType = $state<AssistanceType>('continue_story');
  let prompt = $state('');
  let context = $state('');
  let showContext = $state(false);
  let showHistory = $state(false);
  let showSettings = $state(false);

  // Settings
  let provider = $state<AIProvider>('mock');
  let apiKey = $state('');
  let temperature = $state(0.7);
  let maxTokens = $state(500);

  // Response
  let response = $state<string | null>(null);
  let alternatives = $state<string[]>([]);
  let selectedAlternative = $state(0);

  const templates = aiWritingStore.getTemplates();

  async function handleGenerate() {
    if (!prompt.trim()) {
      return;
    }

    try {
      const result = await aiWritingStore.requestAssistance(
        selectedType,
        prompt,
        showContext ? context : undefined
      );

      response = result.content;
      alternatives = result.alternatives || [];
      selectedAlternative = 0;
    } catch (error) {
      console.error('AI request failed:', error);
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  }

  function handleInsert(text: string) {
    // In a real implementation, this would insert into the current passage editor
    alert('Insert functionality would add this text to the current passage');
  }

  function clearResponse() {
    response = null;
    alternatives = [];
    selectedAlternative = 0;
  }

  function saveSettings() {
    aiWritingStore.updateConfig({
      provider,
      apiKey: apiKey || undefined,
      temperature,
      maxTokens,
    });
    showSettings = false;
  }

  // Update response when lastAIResponse changes
  $effect(() => {
    if ($lastAIResponse) {
      response = $lastAIResponse.content;
      alternatives = $lastAIResponse.alternatives || [];
    }
  });
</script>

<div class="h-full flex flex-col bg-white dark:bg-gray-800">
  <!-- Header -->
  <div class="p-4 border-b border-gray-300 dark:border-gray-700">
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-lg font-bold text-gray-800 dark:text-gray-200">AI Writing Assistant</h2>
      <div class="flex gap-2">
        <button
          type="button"
          onclick={() => showHistory = !showHistory}
          class="px-2 py-1 text-xs rounded {showHistory ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}"
          title="View History"
        >
          📜
        </button>
        <button
          type="button"
          onclick={() => showSettings = !showSettings}
          class="px-2 py-1 text-xs rounded {showSettings ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}"
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </div>
    <p class="text-xs text-gray-600 dark:text-gray-400">Get AI-powered help with your story</p>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    {#if showSettings}
      <!-- Settings Panel -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="font-medium text-sm">Settings</h3>
          <button
            type="button"
            onclick={() => showSettings = false}
            class="text-xs text-blue-600 hover:text-blue-700"
          >
            Done
          </button>
        </div>

        <div>
          <label for="ai-provider" class="block text-xs font-medium mb-1">Provider</label>
          <select
            id="ai-provider"
            bind:value={provider}
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
          >
            <option value="mock">Mock (Demo)</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic Claude</option>
            <option value="custom">Custom Endpoint</option>
          </select>
        </div>

        {#if provider !== 'mock'}
          <div>
            <label for="ai-api-key" class="block text-xs font-medium mb-1">API Key</label>
            <input
              id="ai-api-key"
              type="password"
              bind:value={apiKey}
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              placeholder="sk-..."
            />
          </div>
        {/if}

        <div>
          <label for="ai-temperature" class="block text-xs font-medium mb-1">Temperature: {temperature.toFixed(1)}</label>
          <input
            id="ai-temperature"
            type="range"
            bind:value={temperature}
            min="0"
            max="1"
            step="0.1"
            class="w-full"
          />
          <div class="flex justify-between text-xs text-gray-600">
            <span>Focused</span>
            <span>Creative</span>
          </div>
        </div>

        <div>
          <label for="ai-max-tokens" class="block text-xs font-medium mb-1">Max Tokens: {maxTokens}</label>
          <input
            id="ai-max-tokens"
            type="range"
            bind:value={maxTokens}
            min="100"
            max="2000"
            step="100"
            class="w-full"
          />
        </div>

        <button
          type="button"
          onclick={saveSettings}
          class="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save Settings
        </button>
      </div>
    {:else if showHistory}
      <!-- History Panel -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="font-medium text-sm">Request History</h3>
          <div class="flex gap-2">
            <button
              type="button"
              onclick={() => aiWritingStore.clearHistory()}
              class="text-xs text-red-600 hover:text-red-700"
            >
              Clear
            </button>
            <button
              type="button"
              onclick={() => showHistory = false}
              class="text-xs text-blue-600 hover:text-blue-700"
            >
              Done
            </button>
          </div>
        </div>

        <div class="space-y-2">
          {#if $aiHistory.requests.length === 0}
            <p class="text-sm text-gray-500 text-center py-4">No requests yet</p>
          {:else}
            {#each $aiHistory.requests.slice().reverse() as request}
              {@const response = $aiHistory.responses.find(r => r.requestId === request.id)}
              <div class="border border-gray-300 dark:border-gray-600 rounded p-3">
                <div class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {templates[request.type].label}
                </div>
                <div class="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {new Date(request.timestamp).toLocaleString()}
                </div>
                <div class="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded mb-2">
                  {request.prompt.substring(0, 100)}{request.prompt.length > 100 ? '...' : ''}
                </div>
                {#if response}
                  <div class="text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                    {response.content.substring(0, 150)}{response.content.length > 150 ? '...' : ''}
                  </div>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      </div>
    {:else}
      <!-- Main Interface -->
      <div class="space-y-4">
        <!-- Assistance Type -->
        <div>
          <div class="block text-sm font-medium mb-2">What do you need help with?</div>
          <div class="grid grid-cols-2 gap-2">
            {#each Object.entries(templates) as [type, template]}
              <button
                type="button"
                class="p-3 text-left border rounded {selectedType === type ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                onclick={() => {
                  selectedType = type as AssistanceType;
                  clearResponse();
                }}
              >
                <div class="text-sm font-medium">{template.label}</div>
                <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">{template.description}</div>
              </button>
            {/each}
          </div>
        </div>

        <!-- Prompt Input -->
        <div>
          <label for="ai-prompt" class="block text-sm font-medium mb-2">Your Request</label>
          <textarea
            id="ai-prompt"
            bind:value={prompt}
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 resize-none"
            rows="4"
            placeholder={templates[selectedType].placeholder}
          ></textarea>
        </div>

        <!-- Context (Optional) -->
        <div>
          <button
            type="button"
            onclick={() => showContext = !showContext}
            class="text-xs text-blue-600 hover:text-blue-700 mb-2"
          >
            {showContext ? '▼' : '▶'} Add context (optional)
          </button>

          {#if showContext}
            <label for="ai-context" class="sr-only">Context</label>
            <textarea
              id="ai-context"
              bind:value={context}
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 resize-none"
              rows="3"
              placeholder="Provide additional context about your story, characters, or world..."
            ></textarea>
          {/if}
        </div>

        <!-- Generate Button -->
        <button
          type="button"
          onclick={handleGenerate}
          disabled={!prompt.trim() || $isAILoading}
          class="w-full px-4 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {$isAILoading ? 'Generating...' : 'Generate'}
        </button>

        <!-- Error Display -->
        {#if $aiError}
          <div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded">
            <div class="text-sm text-red-800 dark:text-red-200">{$aiError}</div>
            <button
              type="button"
              onclick={() => aiWritingStore.clearError()}
              class="text-xs text-red-600 hover:text-red-700 mt-1"
            >
              Dismiss
            </button>
          </div>
        {/if}

        <!-- Response Display -->
        {#if response}
          <div class="border border-gray-300 dark:border-gray-600 rounded">
            <div class="bg-gray-50 dark:bg-gray-700 px-3 py-2 border-b border-gray-300 dark:border-gray-600">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">Generated Content</span>
                <div class="flex gap-1">
                  <button
                    type="button"
                    onclick={() => handleCopy(alternatives[selectedAlternative] || response!)}
                    class="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                    title="Copy to clipboard"
                  >
                    📋 Copy
                  </button>
                  <button
                    type="button"
                    onclick={() => handleInsert(alternatives[selectedAlternative] || response!)}
                    class="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    title="Insert into passage"
                  >
                    ➕ Insert
                  </button>
                </div>
              </div>
            </div>

            <div class="p-3">
              <div class="text-sm whitespace-pre-wrap bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                {alternatives[selectedAlternative] || response}
              </div>

              <!-- Alternatives -->
              {#if alternatives.length > 0}
                <div class="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                  <div class="text-xs font-medium mb-2">Alternative suggestions:</div>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      onclick={() => selectedAlternative = -1}
                      class="px-3 py-1 text-xs rounded {selectedAlternative === -1 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}"
                    >
                      Original
                    </button>
                    {#each alternatives as _, i}
                      <button
                        type="button"
                        onclick={() => selectedAlternative = i}
                        class="px-3 py-1 text-xs rounded {selectedAlternative === i ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}"
                      >
                        Alt {i + 1}
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <button
            type="button"
            onclick={clearResponse}
            class="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            New Request
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>
