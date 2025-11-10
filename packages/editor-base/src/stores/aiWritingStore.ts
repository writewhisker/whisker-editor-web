/**
 * AI Writing Assistant Store
 *
 * Manages AI-powered writing assistance for interactive fiction:
 * - Content generation (passages, choices, descriptions)
 * - Story continuation suggestions
 * - Character dialogue generation
 * - Plot suggestion and brainstorming
 * - Grammar and style improvement
 * - Consistency checking
 */

import { writable, derived } from 'svelte/store';

export type AssistanceType =
  | 'continue_story'
  | 'generate_choices'
  | 'write_dialogue'
  | 'describe_scene'
  | 'improve_text'
  | 'brainstorm'
  | 'check_consistency';

export type AIProvider = 'mock' | 'openai' | 'anthropic' | 'custom';

export interface AIRequest {
  id: string;
  type: AssistanceType;
  prompt: string;
  context?: string;
  parameters?: Record<string, any>;
  timestamp: number;
}

export interface AIResponse {
  id: string;
  requestId: string;
  content: string;
  alternatives?: string[];
  timestamp: number;
}

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  customEndpoint?: string;
}

export interface AIHistory {
  requests: AIRequest[];
  responses: AIResponse[];
}

export interface AIWritingState {
  config: AIConfig;
  history: AIHistory;
  isLoading: boolean;
  currentRequest: AIRequest | null;
  lastResponse: AIResponse | null;
  error: string | null;
}

const DEFAULT_CONFIG: AIConfig = {
  provider: 'mock',
  temperature: 0.7,
  maxTokens: 500,
};

const DEFAULT_STATE: AIWritingState = {
  config: DEFAULT_CONFIG,
  history: {
    requests: [],
    responses: [],
  },
  isLoading: false,
  currentRequest: null,
  lastResponse: null,
  error: null,
};

// Mock AI responses for demonstration
const MOCK_RESPONSES: Record<AssistanceType, string[]> = {
  continue_story: [
    'As you step through the ancient doorway, the musty smell of centuries-old secrets fills your nostrils. The corridor ahead is dimly lit by flickering torches, their shadows dancing on the weathered stone walls. In the distance, you hear the faint echo of footsteps.',
    'The merchant eyes you suspiciously before finally nodding. "Very well," he says, producing a worn leather pouch from beneath his cloak. "But remember - some knowledge comes with a price you may not wish to pay." His cryptic warning hangs in the air as he hands you the item.',
    'Night falls quickly in these mountains. You make camp beside a small stream, the sound of rushing water a welcome companion in the wilderness. As you tend to the fire, something catches your eye in the tree line - a pair of gleaming eyes watching from the darkness.',
  ],
  generate_choices: [
    '[[Investigate the mysterious sound]]\n[[Stay hidden and observe]]\n[[Call out to identify yourself]]\n[[Retreat quietly]]',
    '[[Accept the merchant\'s offer]]\n[[Negotiate for better terms]]\n[[Refuse politely]]\n[[Question his motives]]',
    '[[Approach the creature cautiously]]\n[[Throw a stone to scare it away]]\n[[Ignore it and go to sleep]]\n[[Build up the fire for protection]]',
  ],
  write_dialogue: [
    '"I\'ve been expecting you," the old wizard says, not looking up from his ancient tome. "The prophecy spoke of one who would come seeking answers. But tell me - are you prepared for the truth?"',
    '"You don\'t understand what you\'re asking," she whispers urgently, glancing over her shoulder. "The Council has eyes everywhere. If they knew we were even having this conversation..." She trails off, fear evident in her voice.',
    '"Ha!" the dwarf barks out a laugh, slapping his knee. "In all my years mining these tunnels, I\'ve never seen anyone fool enough to try that route. But I like your spirit, friend. Perhaps you\'ll surprise me yet."',
  ],
  describe_scene: [
    'The grand hall stretches before you, its vaulted ceiling disappearing into shadow high above. Massive pillars of carved marble line the walls, each depicting scenes from long-forgotten battles. Shafts of colored light stream through stained glass windows, painting the dusty air in hues of crimson and gold. At the far end, an enormous throne sits empty, waiting.',
    'The marketplace bustles with life and energy. Vendors call out their wares from wooden stalls draped in colorful fabric. The mingled scents of exotic spices, fresh bread, and roasting meat fill the air. Children weave through the crowd, laughing and playing, while merchants haggle animatedly with customers. Above it all, the azure sky is dotted with white clouds.',
    'The library is a labyrinth of towering bookshelves that seem to reach endlessly upward. Leather-bound volumes of every size and color pack the shelves, their spines bearing titles in languages both familiar and strange. The air is thick with the smell of old paper and ink. A single reading desk sits in a pool of lamplight, surrounded by the quiet whispers of knowledge.',
  ],
  improve_text: [
    'Original: "The man walked into the room. He was tall."\nImproved: "The tall figure strode into the chamber, his presence immediately commanding attention."\n\nSuggestions:\n- More vivid verb choice ("strode" vs "walked")\n- Combined sentences for better flow\n- More descriptive language ("commanding attention")\n- Varied sentence structure',
    'Original: "She said she was scared."\nImproved: "\'I\'m terrified,\' she whispered, her voice trembling."\n\nSuggestions:\n- Show, don\'t tell - use dialogue and action\n- Added sensory details (voice trembling)\n- More impactful word choice ("terrified" vs "scared")\n- Creates more immersive scene',
    'Original: "The monster was very big and scary."\nImproved: "The creature loomed overhead, its massive form casting a shadow that swallowed the entire clearing."\n\nSuggestions:\n- Replace vague adjectives with specific imagery\n- Use active verbs ("loomed", "casting")\n- Add concrete details (shadow, clearing)\n- Create visual impact through description',
  ],
  brainstorm: [
    'Plot Twist Ideas:\n\n1. **The Betrayal**: The mentor figure who has been guiding the protagonist is actually working for the antagonist\n2. **Hidden Identity**: The protagonist discovers they are related to their greatest enemy\n3. **False Victory**: What seemed like the final triumph was actually part of the villain\'s plan all along\n4. **Time Loop**: The story has been repeating, and the protagonist starts remembering previous iterations\n5. **Unreliable Reality**: Events the protagonist believed happened were actually illusions or dreams',
    'Character Development Ideas:\n\n1. **The Reluctant Hero**: Starts selfish, gradually learns to care about others through consequences of their actions\n2. **The Fallen Mentor**: Once a hero, now bitter and cynical - can the protagonist restore their faith?\n3. **The Double Agent**: Seemingly loyal companion with divided loyalties - which side will they choose?\n4. **The Redeemed Villain**: Antagonist who realizes the error of their ways and seeks redemption\n5. **The Corrupted Innocent**: Pure character gradually tempted by power or revenge',
    'Setting Expansion Ideas:\n\n1. **The Undercity**: A hidden layer beneath the main city where outcasts and criminals dwell\n2. **The Floating Islands**: Sky-bound settlements connected by rope bridges and airships\n3. **The Memory Gardens**: A place where thoughts and dreams take physical form\n4. **The Timeless Library**: A repository where past, present, and future coexist\n5. **The Borderlands**: A shifting, unstable region between realities',
  ],
  check_consistency: [
    'Consistency Check Results:\n\n✓ Character Names: All consistent\n⚠ Timeline: Potential issue - Character mentions "yesterday" but previous passage was set "weeks ago"\n✓ Location: Smooth transitions between scenes\n⚠ Character Knowledge: Protagonist knows information they shouldn\'t have learned yet\n✓ Established Rules: Magic system remains consistent\n\nRecommendations:\n1. Review timeline references in passages 12-15\n2. Add a scene where protagonist learns the crucial information\n3. Consider adding passage notes for complex timelines',
    'Consistency Analysis:\n\n✓ Character Voice: Dialogue style matches established personality\n⚠ Plot Threads: "The stolen artifact" mentioned in passage 3 hasn\'t been resolved\n✓ World Rules: Technology level consistent throughout\n⚠ Character Relationships: Sudden shift in Character B\'s attitude toward protagonist needs explanation\n✓ Descriptions: Location details match across multiple visits\n\nSuggestions:\n1. Plan resolution for the artifact subplot\n2. Add a scene explaining the relationship change\n3. Use variable tracking for important plot threads',
    'Quality Review:\n\n✓ Pacing: Good balance of action and exposition\n⚠ Repetitive Phrases: "Suddenly" used 8 times - consider alternatives\n✓ Choice Meaningfulness: Player decisions have clear consequences\n⚠ Dead Ends: 3 passages lead nowhere - add more connections\n✓ Branching Depth: Good variety of paths\n\nEnhancements:\n1. Vary sentence openings for better flow\n2. Create more choice consequences in passages 18, 22, 31\n3. Review passages marked as "TODO"',
  ],
};

// Simulate API call delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generate mock response
function generateMockResponse(type: AssistanceType): string {
  const responses = MOCK_RESPONSES[type];
  return responses[Math.floor(Math.random() * responses.length)];
}

// Create AI writing store
const createAIWritingStore = () => {
  const { subscribe, set, update } = writable<AIWritingState>(DEFAULT_STATE);

  return {
    subscribe,

    /**
     * Update AI configuration
     */
    updateConfig: (updates: Partial<AIConfig>) => {
      update(state => ({
        ...state,
        config: { ...state.config, ...updates },
      }));
    },

    /**
     * Request AI assistance
     */
    requestAssistance: async (
      type: AssistanceType,
      prompt: string,
      context?: string,
      parameters?: Record<string, any>
    ): Promise<AIResponse> => {
      const request: AIRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        prompt,
        context,
        parameters,
        timestamp: Date.now(),
      };

      // Set loading state
      update(state => ({
        ...state,
        isLoading: true,
        currentRequest: request,
        error: null,
      }));

      try {
        // Simulate API call
        await delay(1000 + Math.random() * 1500);

        // Generate response (in real implementation, call actual AI API)
        const content = generateMockResponse(type);

        const response: AIResponse = {
          id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          requestId: request.id,
          content,
          alternatives: type === 'continue_story' ? [
            generateMockResponse(type),
            generateMockResponse(type),
          ] : undefined,
          timestamp: Date.now(),
        };

        // Update state with response
        update(state => ({
          ...state,
          isLoading: false,
          currentRequest: null,
          lastResponse: response,
          history: {
            requests: [...state.history.requests, request],
            responses: [...state.history.responses, response],
          },
        }));

        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        update(state => ({
          ...state,
          isLoading: false,
          currentRequest: null,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Clear error
     */
    clearError: () => {
      update(state => ({ ...state, error: null }));
    },

    /**
     * Clear history
     */
    clearHistory: () => {
      update(state => ({
        ...state,
        history: { requests: [], responses: [] },
        lastResponse: null,
      }));
    },

    /**
     * Get suggestion templates
     */
    getTemplates: (): Record<AssistanceType, { label: string; description: string; placeholder: string }> => {
      return {
        continue_story: {
          label: 'Continue Story',
          description: 'Generate the next part of your narrative',
          placeholder: 'Describe the current situation or where you want the story to go...',
        },
        generate_choices: {
          label: 'Generate Choices',
          description: 'Create meaningful player choices for a situation',
          placeholder: 'Describe the situation and what kind of choices you need...',
        },
        write_dialogue: {
          label: 'Write Dialogue',
          description: 'Generate character dialogue',
          placeholder: 'Describe the character and conversation context...',
        },
        describe_scene: {
          label: 'Describe Scene',
          description: 'Create vivid scene descriptions',
          placeholder: 'What location or scene do you want described?',
        },
        improve_text: {
          label: 'Improve Text',
          description: 'Enhance your writing with better word choice and flow',
          placeholder: 'Paste the text you want to improve...',
        },
        brainstorm: {
          label: 'Brainstorm Ideas',
          description: 'Generate plot ideas, twists, or character concepts',
          placeholder: 'What aspect of your story do you need ideas for?',
        },
        check_consistency: {
          label: 'Check Consistency',
          description: 'Analyze your story for plot holes and inconsistencies',
          placeholder: 'Describe what aspects to check or leave blank for full analysis...',
        },
      };
    },

    /**
     * Reset to defaults
     */
    reset: () => {
      set(DEFAULT_STATE);
    },
  };
};

export const aiWritingStore = createAIWritingStore();

// Derived stores
export const aiWritingConfig = derived(aiWritingStore, $store => $store.config);
export const isAILoading = derived(aiWritingStore, $store => $store.isLoading);
export const aiHistory = derived(aiWritingStore, $store => $store.history);
export const lastAIResponse = derived(aiWritingStore, $store => $store.lastResponse);
export const aiError = derived(aiWritingStore, $store => $store.error);
