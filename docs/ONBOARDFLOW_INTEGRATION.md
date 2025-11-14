# OnboardFlow Integration Guide

**Private Documentation - Not for Public Repository**

This guide documents how OnboardFlow (private SaaS product) integrates with Whisker packages.

---

## Overview

OnboardFlow is a separate private repository (`whisker-app-onboardflow`) that consumes Whisker packages from npm to build a SaaS onboarding flow builder.

## Package Usage

### Installation

```bash
npm install @whisker/core-ts @whisker/editor-base @whisker/shared-ui
```

### Supabase Adapter

OnboardFlow uses the Supabase adapter for realtime state management:

```typescript
// onboardflow/src/lib/whiskerAdapter.ts
import { createSupabaseEditorAdapter } from '@whisker/editor-base/adapters';
import { supabase } from './supabase';

export function setupWhiskerIntegration(projectId: string, userId: string) {
  const adapter = createSupabaseEditorAdapter(supabase, projectId, userId);
  return adapter;
}
```

### Component Integration

```svelte
<!-- onboardflow/src/routes/Editor.svelte -->
<script lang="ts">
  import { GraphView, MenuBar, PropertiesPanel } from '@whisker/editor-base/api';
  import { setupWhiskerIntegration } from '$lib/whiskerAdapter';

  let { projectId, userId } = $props();
  const adapter = setupWhiskerIntegration(projectId, userId);
</script>

<div class="onboardflow-editor">
  <MenuBar {adapter} />
  <div class="editor-layout">
    <GraphView {adapter} />
    <PropertiesPanel {adapter} />
  </div>
</div>
```

### Custom Analytics Plugin

```typescript
// onboardflow/packages/onboarding-extensions/src/analyticsPlugin.ts
import type { EditorPlugin } from '@whisker/editor-base/api';

export const analyticsPlugin: EditorPlugin = {
  name: 'onboardflow-analytics',
  version: '1.0.0',
  
  saas: {
    permissions: {
      requiredPlan: 'pro',
      checkAccess: async (user) => user.plan === 'pro',
    },
    storage: {
      save: async (data, ctx) => {
        await supabase.from('plugin_data').upsert({
          user_id: ctx.userId,
          project_id: ctx.projectId,
          data,
        });
      },
    },
  },
  
  runtime: {
    onPublish: async (url, ctx) => {
      analytics.track('Flow Published', { url, projectId: ctx.projectId });
    },
  },
};
```

## Benefits for OnboardFlow

✅ No forking required - use Whisker components as-is
✅ Supabase realtime integration via adapter
✅ Full TypeScript type safety
✅ Easy updates from npm without merge conflicts
✅ Custom SaaS plugins (billing, analytics, storage)
✅ Flexible state management

## Supabase Schema

OnboardFlow requires these Supabase tables:

```sql
-- Projects table
create table projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  organization_id uuid references organizations,
  story_data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Plugin data table
create table plugin_data (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  project_id uuid references projects not null,
  plugin_id text not null,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table projects enable row level security;
alter table plugin_data enable row level security;
```

## Next Steps

1. Create whisker-app-onboardflow private repository
2. Set up Supabase database with schema above
3. Install Whisker packages from npm
4. Implement Supabase adapter using createSupabaseEditorAdapter
5. Build custom plugins for analytics, embedding, team features
6. Integrate Whisker components in OnboardFlow editor pages

## Support

For OnboardFlow-specific questions, contact the Whisker team privately.
