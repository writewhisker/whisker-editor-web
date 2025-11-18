# OnboardFlow Integration Example

**Complete working example** of integrating Whisker into OnboardFlow SaaS product.

---

## Repository Structure

```
whisker-app-onboardflow/  (PRIVATE REPOSITORY)
├── apps/
│   └── onboardflow/
│       ├── src/
│       │   ├── routes/
│       │   │   ├── +layout.svelte
│       │   │   ├── dashboard/+page.svelte
│       │   │   ├── editor/[projectId]/+page.svelte
│       │   │   ├── analytics/+page.svelte
│       │   │   └── settings/+page.svelte
│       │   ├── lib/
│       │   │   ├── supabase.ts
│       │   │   ├── whiskerAdapter.ts
│       │   │   ├── auth.ts
│       │   │   └── billing.ts
│       │   └── app.html
│       ├── static/
│       └── package.json
│
├── packages/
│   └── onboarding-extensions/
│       ├── src/
│       │   ├── plugins/
│       │   │   ├── analyticsPlugin.ts
│       │   │   ├── embedPlugin.ts
│       │   │   ├── teamPlugin.ts
│       │   │   └── brandingPlugin.ts
│       │   └── index.ts
│       └── package.json
│
├── supabase/
│   ├── migrations/
│   └── config.toml
│
├── package.json
├── pnpm-workspace.yaml
└── .env.example
```

---

## Installation

### 1. Create Repository

```bash
mkdir whisker-app-onboardflow
cd whisker-app-onboardflow
git init
pnpm init
```

### 2. Install Whisker Packages

```json
// package.json
{
  "name": "whisker-app-onboardflow",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "dependencies": {
    "@whisker/core-ts": "^0.1.0",
    "@whisker/editor-base": "^0.1.0",
    "@whisker/shared-ui": "^0.1.0"
  },
  "devDependencies": {
    "@sveltejs/kit": "^2.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "svelte": "^5.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

```bash
pnpm install
```

---

## Supabase Setup

### Database Schema

```sql
-- supabase/migrations/001_initial_schema.sql

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Users (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'enterprise')),
  status TEXT NOT NULL,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Projects (OnboardFlow flows)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  story_data JSONB NOT NULL,
  published_url TEXT,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Plugin Data
CREATE TABLE plugin_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id),
  plugin_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, project_id, plugin_id)
);

-- Analytics Events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  event_name TEXT NOT NULL,
  properties JSONB,
  user_id TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_data ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own organization's projects
CREATE POLICY "Users can CRUD org projects"
ON projects
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Users can manage their own plugin data
CREATE POLICY "Users can CRUD their plugin data"
ON plugin_data
FOR ALL
USING (user_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
```

---

## Whisker Adapter Implementation

```typescript
// apps/onboardflow/src/lib/whiskerAdapter.ts

import type { EditorAdapter } from '@whisker/editor-base/adapters';
import type { Story, Passage } from '@whisker/core-ts';
import { writable, derived, get, type Writable } from 'svelte/store';
import { supabase } from './supabase';
import { toast } from './toast';

export interface OnboardFlowAdapterOptions {
  projectId: string;
  userId: string;
  organizationId: string;
}

export function createOnboardFlowAdapter(options: OnboardFlowAdapterOptions): EditorAdapter {
  const { projectId, userId, organizationId } = options;

  // Local reactive state
  const storyStore: Writable<Story | null> = writable(null);
  const selectedPassageIdStore: Writable<string | null> = writable(null);

  // Derived stores
  const passagesStore = derived(storyStore, $story =>
    $story?.passages || new Map()
  );

  const filteredPassagesStore = derived(storyStore, $story =>
    $story?.passages || new Map()
  );

  // Loading state
  let isLoading = true;
  let channel: any = null;

  // Load initial data
  async function loadInitialData() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('story_data')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      storyStore.set(data.story_data);
      isLoading = false;
    } catch (error) {
      console.error('Failed to load project:', error);
      toast.error('Failed to load project');
    }
  }

  // Subscribe to realtime changes
  function setupRealtime() {
    channel = supabase
      .channel(`project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`,
        },
        (payload) => {
          console.log('Realtime update:', payload);
          storyStore.set(payload.new.story_data);
        }
      )
      .subscribe();
  }

  // Cleanup function
  function cleanup() {
    if (channel) {
      channel.unsubscribe();
    }
  }

  // Initialize
  loadInitialData();
  setupRealtime();

  // Create adapter
  const adapter: EditorAdapter & { _cleanup: () => void } = {
    story: {
      currentStory: {
        subscribe: storyStore.subscribe,
      },

      passages: {
        subscribe: passagesStore.subscribe,
      },

      selectedPassageId: {
        subscribe: selectedPassageIdStore.subscribe,
        set: selectedPassageIdStore.set,
        update: selectedPassageIdStore.update,
      },

      filteredPassages: {
        subscribe: filteredPassagesStore.subscribe,
      },

      updatePassage: async (passageId: string, updates: Partial<Passage>) => {
        // Optimistic update
        storyStore.update((story) => {
          if (!story) return story;

          const passage = story.passages.get(passageId);
          if (passage) {
            Object.assign(passage, updates);
          }

          return story;
        });

        // Sync to Supabase
        try {
          const story = get(storyStore);
          const { error } = await supabase
            .from('projects')
            .update({
              story_data: story,
              updated_at: new Date().toISOString(),
            })
            .eq('id', projectId);

          if (error) throw error;
        } catch (error) {
          console.error('Failed to update passage:', error);
          toast.error('Failed to save changes');

          // Reload on error
          await loadInitialData();
        }
      },

      deletePassage: async (passageId: string) => {
        // Optimistic delete
        storyStore.update((story) => {
          if (!story) return story;
          story.passages.delete(passageId);
          return story;
        });

        // Sync to Supabase
        try {
          const story = get(storyStore);
          const { error } = await supabase
            .from('projects')
            .update({
              story_data: story,
              updated_at: new Date().toISOString(),
            })
            .eq('id', projectId);

          if (error) throw error;
        } catch (error) {
          console.error('Failed to delete passage:', error);
          toast.error('Failed to delete passage');
          await loadInitialData();
        }
      },

      createPassage: async (passage: Partial<Passage>) => {
        const { Passage } = await import('@whisker/core-ts');
        const newPassage = new Passage(passage);

        // Optimistic create
        storyStore.update((story) => {
          if (!story) return story;
          story.passages.set(newPassage.id, newPassage);
          return story;
        });

        // Sync to Supabase
        try {
          const story = get(storyStore);
          const { error } = await supabase
            .from('projects')
            .update({
              story_data: story,
              updated_at: new Date().toISOString(),
            })
            .eq('id', projectId);

          if (error) throw error;

          return newPassage;
        } catch (error) {
          console.error('Failed to create passage:', error);
          toast.error('Failed to create passage');
          await loadInitialData();
          throw error;
        }
      },
    },

    notifications: {
      show: (message: string, type: 'info' | 'success' | 'warning' | 'error') => {
        toast[type](message);
      },
    },

    history: {
      canUndo: writable(false),
      canRedo: writable(false),
      undo: () => {
        toast.info('Undo not implemented yet');
      },
      redo: () => {
        toast.info('Redo not implemented yet');
      },
    },

    _cleanup: cleanup,
  };

  return adapter;
}
```

---

## OnboardFlow Plugins

### Analytics Plugin

```typescript
// packages/onboarding-extensions/src/plugins/analyticsPlugin.ts

import type { EditorPlugin } from '@whisker/editor-base/api';
import { supabase } from '../../../apps/onboardflow/src/lib/supabase';

export const analyticsPlugin: EditorPlugin = {
  name: 'onboardflow-analytics',
  version: '1.0.0',
  author: 'OnboardFlow',
  description: 'Advanced analytics and tracking for onboarding flows',

  saas: {
    permissions: {
      requiredPlan: 'pro',
      requiredFeatures: ['analytics', 'advanced-tracking'],
      checkAccess: async (user) => {
        // Check subscription
        const { data } = await supabase
          .from('subscriptions')
          .select('plan')
          .eq('organization_id', user.organizationId)
          .single();

        return data?.plan === 'pro' || data?.plan === 'enterprise';
      },
    },

    settings: {
      schema: {
        segmentWriteKey: {
          type: 'string',
          label: 'Segment Write Key',
          description: 'Your Segment.io write key',
          required: false,
        },
        trackPageViews: {
          type: 'boolean',
          label: 'Track Page Views',
          description: 'Automatically track when passages are viewed',
          default: true,
        },
        trackChoices: {
          type: 'boolean',
          label: 'Track Choices',
          description: 'Track user choices',
          default: true,
        },
      },
      defaults: {
        trackPageViews: true,
        trackChoices: true,
      },
    },

    storage: {
      save: async (data, context) => {
        await supabase.from('plugin_data').upsert({
          user_id: context.userId,
          project_id: context.projectId,
          plugin_id: 'onboardflow-analytics',
          data,
          updated_at: new Date().toISOString(),
        });
      },

      load: async (context) => {
        const { data } = await supabase
          .from('plugin_data')
          .select('data')
          .eq('user_id', context.userId)
          .eq('project_id', context.projectId)
          .eq('plugin_id', 'onboardflow-analytics')
          .single();

        return data?.data || {};
      },
    },
  },

  runtime: {
    onInit: async (context) => {
      console.log('[Analytics] Initialized for project:', context.projectId);
    },

    onPassageEnter: async (passage, context) => {
      // Track page view
      await supabase.from('analytics_events').insert({
        project_id: context.projectId,
        event_name: 'passage_viewed',
        properties: {
          passageId: passage.id,
          passageTitle: passage.title,
        },
        user_id: context.userId,
      });
    },

    onPublish: async (publishUrl, context) => {
      // Track publish event
      await supabase.from('analytics_events').insert({
        project_id: context.projectId,
        event_name: 'flow_published',
        properties: {
          publishUrl,
        },
        user_id: context.userId,
      });

      console.log('[Analytics] Flow published:', publishUrl);
    },

    onUserIdentify: async (userId, traits) => {
      // If Segment is configured, identify user
      if (window.analytics) {
        window.analytics.identify(userId, traits);
      }
    },

    onAnalyticsEvent: async (eventName, properties) => {
      // Track custom event
      await supabase.from('analytics_events').insert({
        project_id: properties.projectId,
        event_name: eventName,
        properties,
        user_id: properties.userId,
      });
    },
  },
};
```

### Embed Plugin

```typescript
// packages/onboarding-extensions/src/plugins/embedPlugin.ts

import type { EditorPlugin } from '@whisker/editor-base/api';

export const embedPlugin: EditorPlugin = {
  name: 'onboardflow-embed',
  version: '1.0.0',
  description: 'Generate embed codes for flows',

  saas: {
    settings: {
      schema: {
        customDomain: {
          type: 'string',
          label: 'Custom Domain',
          description: 'Your custom domain for embeds',
          required: false,
        },
        showBranding: {
          type: 'boolean',
          label: 'Show OnboardFlow Branding',
          description: 'Display "Powered by OnboardFlow"',
          default: true,
        },
      },
    },
  },

  // Custom methods for embed generation
  generateIframe: (projectId: string, options?: any) => {
    const domain = options?.customDomain || 'app.onboardflow.com';
    return `<iframe src="https://${domain}/embed/${projectId}" width="100%" height="600px" frameborder="0"></iframe>`;
  },

  generateScript: (projectId: string, options?: any) => {
    return `<script src="https://cdn.onboardflow.com/sdk.js"></script>
<script>
  OnboardFlow.init({
    projectId: '${projectId}',
    target: '#onboardflow-container'
  });
</script>
<div id="onboardflow-container"></div>`;
  },
};
```

---

## Editor Page

```svelte
<!-- apps/onboardflow/src/routes/editor/[projectId]/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import {
    GraphView,
    MenuBar,
    PropertiesPanel,
    PassageList,
  } from '@whisker/editor-base/api';
  import { pluginManager } from '@whisker/editor-base/api';
  import '@whisker/shared-ui/styles';

  import { createOnboardFlowAdapter } from '$lib/whiskerAdapter';
  import { session } from '$lib/auth';
  import {
    analyticsPlugin,
    embedPlugin,
    teamPlugin,
    brandingPlugin,
  } from 'onboarding-extensions';

  // Get project ID from URL
  const projectId = $page.params.projectId;

  // Create adapter
  let adapter: any;
  let isReady = false;

  onMount(async () => {
    if (!$session) return;

    // Create adapter with user context
    adapter = createOnboardFlowAdapter({
      projectId,
      userId: $session.user.id,
      organizationId: $session.user.organizationId,
    });

    // Register plugins
    try {
      await pluginManager.register(analyticsPlugin);
      await pluginManager.register(embedPlugin);
      await pluginManager.register(teamPlugin);
      await pluginManager.register(brandingPlugin);

      isReady = true;
    } catch (error) {
      console.error('Failed to register plugins:', error);
    }
  });

  onDestroy(() => {
    adapter?._cleanup?.();
  });
</script>

<svelte:head>
  <title>Editor - OnboardFlow</title>
</svelte:head>

<div class="onboardflow-editor">
  {#if isReady && adapter}
    <header class="editor-header">
      <MenuBar {adapter} />
    </header>

    <div class="editor-layout">
      <aside class="sidebar-left">
        <PassageList {adapter} />
      </aside>

      <main class="editor-main">
        <GraphView {adapter} />
      </main>

      <aside class="sidebar-right">
        <PropertiesPanel {adapter} />
      </aside>
    </div>
  {:else}
    <div class="loading">
      <p>Loading editor...</p>
    </div>
  {/if}
</div>

<style>
  .onboardflow-editor {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--whisker-color-background);
  }

  .editor-header {
    border-bottom: 1px solid var(--whisker-color-border);
  }

  .editor-layout {
    flex: 1;
    display: grid;
    grid-template-columns: 250px 1fr 300px;
    overflow: hidden;
  }

  .sidebar-left,
  .sidebar-right {
    border-right: 1px solid var(--whisker-color-border);
    overflow-y: auto;
  }

  .sidebar-right {
    border-right: none;
    border-left: 1px solid var(--whisker-color-border);
  }

  .editor-main {
    position: relative;
    overflow: hidden;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
  }
</style>
```

---

## Package Configuration

```json
// packages/onboarding-extensions/package.json
{
  "name": "onboarding-extensions",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "dependencies": {
    "@whisker/core-ts": "^0.1.0",
    "@whisker/editor-base": "^0.1.0",
    "@supabase/supabase-js": "^2.0.0"
  }
}
```

```typescript
// packages/onboarding-extensions/src/index.ts
export { analyticsPlugin } from './plugins/analyticsPlugin';
export { embedPlugin } from './plugins/embedPlugin';
export { teamPlugin } from './plugins/teamPlugin';
export { brandingPlugin } from './plugins/brandingPlugin';
```

---

## Environment Variables

```bash
# .env.example
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx

STRIPE_PUBLIC_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

SEGMENT_WRITE_KEY=xxx
```

---

## Running OnboardFlow

```bash
# Install dependencies
pnpm install

# Run Supabase locally
pnpm supabase start

# Run migrations
pnpm supabase db push

# Start dev server
pnpm dev

# Visit http://localhost:5173
```

---

## Publishing a Flow

```typescript
// apps/onboardflow/src/lib/publish.ts

import { supabase } from './supabase';
import { pluginManager } from '@whisker/editor-base/api';

export async function publishFlow(projectId: string, userId: string) {
  try {
    // Generate publish URL
    const publishUrl = `https://app.onboardflow.com/flow/${projectId}`;

    // Update project
    const { error } = await supabase
      .from('projects')
      .update({
        published_url: publishUrl,
        published_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (error) throw error;

    // Trigger plugin hooks
    const context = {
      userId,
      projectId,
      storyState: {},
      variables: new Map(),
      currentPassage: null,
      history: [],
    };

    // Call onPublish hooks
    const plugins = pluginManager.getPlugins();
    for (const plugin of plugins) {
      if (plugin.runtime?.onPublish) {
        await plugin.runtime.onPublish(publishUrl, context);
      }
    }

    return { success: true, url: publishUrl };
  } catch (error) {
    console.error('Publish failed:', error);
    return { success: false, error };
  }
}
```

---

## Summary

This complete example shows:

✅ **Supabase Integration** - Database schema and realtime sync
✅ **Whisker Adapter** - Full implementation with optimistic updates
✅ **Custom Plugins** - Analytics, embed, team, branding
✅ **Editor Page** - Using Whisker components with OnboardFlow state
✅ **Plugin Hooks** - onPublish, onUserIdentify, onAnalyticsEvent
✅ **Storage** - Plugin data in Supabase
✅ **Publishing** - Flow publishing with hooks

**OnboardFlow is ready to build!** 🚀
