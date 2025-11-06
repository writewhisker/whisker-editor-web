# OnboardFlow Architecture Plan

## Overview

OnboardFlow is a **separate private repository** that consumes published `@whisker/*` packages to build a proprietary SaaS onboarding editor.

**Start After**: Week 8 (when @whisker packages are published to npm)

---

# Repository Structure

## Separate Git Repository

```
onboardflow/  (NEW PRIVATE REPOSITORY)
├── packages/
│   ├── onboarding-extensions/
│   │   ├── src/
│   │   │   ├── analytics/
│   │   │   │   ├── AnalyticsPlugin.ts
│   │   │   │   ├── EventTracking.ts
│   │   │   │   ├── FunnelAnalytics.ts
│   │   │   │   └── UserBehavior.ts
│   │   │   ├── embed/
│   │   │   │   ├── EmbedPlugin.ts
│   │   │   │   ├── IframeEmbed.svelte
│   │   │   │   ├── ScriptEmbed.ts
│   │   │   │   └── CustomDomain.ts
│   │   │   ├── team/
│   │   │   │   ├── TeamPlugin.ts
│   │   │   │   ├── UserManagement.ts
│   │   │   │   ├── RolePermissions.ts
│   │   │   │   └── CollaborativeEditing.svelte
│   │   │   ├── integrations/
│   │   │   │   ├── Segment.ts
│   │   │   │   ├── Amplitude.ts
│   │   │   │   ├── Mixpanel.ts
│   │   │   │   └── Zapier.ts
│   │   │   ├── branding/
│   │   │   │   ├── BrandingPlugin.ts
│   │   │   │   ├── CustomTheme.ts
│   │   │   │   ├── WhiteLabel.svelte
│   │   │   │   └── LogoUpload.svelte
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── onboardflow-backend/
│       ├── src/
│       │   ├── api/
│       │   ├── auth/
│       │   ├── database/
│       │   ├── storage/
│       │   └── services/
│       ├── package.json
│       └── README.md
│
├── apps/
│   └── onboardflow/
│       ├── src/
│       │   ├── App.svelte
│       │   ├── main.ts
│       │   ├── routes/
│       │   │   ├── Dashboard.svelte
│       │   │   ├── Editor.svelte
│       │   │   ├── Analytics.svelte
│       │   │   ├── Settings.svelte
│       │   │   └── TeamManagement.svelte
│       │   ├── components/
│       │   │   ├── Navbar.svelte
│       │   │   ├── Sidebar.svelte
│       │   │   └── BillingPanel.svelte
│       │   └── styles/
│       ├── package.json
│       └── vite.config.ts
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
├── .gitignore
├── LICENSE (Proprietary)
└── README.md
```

---

# Package Dependencies

## apps/onboardflow/package.json

```json
{
  "name": "onboardflow",
  "version": "1.0.0",
  "private": true,
  "license": "PROPRIETARY",
  "dependencies": {
    // Whisker packages from npm
    "@whisker/core-ts": "^0.1.0",
    "@whisker/editor-base": "^0.1.0",
    "@whisker/shared-ui": "^0.1.0",

    // OnboardFlow packages (workspace)
    "onboarding-extensions": "workspace:*",
    "onboardflow-backend": "workspace:*",

    // SaaS infrastructure
    "svelte": "^5.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "stripe": "^14.0.0",
    "@auth/sveltekit": "^0.5.0",

    // Analytics & tracking
    "@segment/analytics-next": "^1.0.0",
    "posthog-js": "^1.0.0"
  }
}
```

## packages/onboarding-extensions/package.json

```json
{
  "name": "onboarding-extensions",
  "version": "1.0.0",
  "private": true,
  "license": "PROPRIETARY",
  "dependencies": {
    "@whisker/core-ts": "^0.1.0",
    "@whisker/editor-base": "^0.1.0",
    "svelte": "^5.0.0"
  }
}
```

---

# OnboardFlow Plugins

## 1. Analytics Plugin

### `packages/onboarding-extensions/src/analytics/AnalyticsPlugin.ts`

```typescript
import type { EditorPlugin } from '@whisker/editor-base';
import AnalyticsPanel from './AnalyticsPanel.svelte';
import EventTracking from './EventTracking';

export const analyticsPlugin: EditorPlugin = {
  name: 'analytics',
  version: '1.0.0',
  author: 'OnboardFlow',
  description: 'Advanced analytics and tracking for onboarding flows',

  nodeTypes: [
    {
      type: 'analytics-event',
      label: 'Track Event',
      icon: 'chart-bar',
      color: '#6366f1',
      description: 'Send analytics event',
    },
  ],

  actions: [
    {
      type: 'track-event',
      label: 'Track Event',
      description: 'Send event to analytics platform',
      execute: async (context, params) => {
        await EventTracking.track(params.eventName, params.properties);
      },
    },
    {
      type: 'identify-user',
      label: 'Identify User',
      description: 'Identify user in analytics',
      execute: async (context, params) => {
        await EventTracking.identify(params.userId, params.traits);
      },
    },
  ],

  ui: {
    sidebar: AnalyticsPanel,
  },

  runtime: {
    onInit: async (context) => {
      // Initialize analytics SDK
      await EventTracking.init({
        writeKey: process.env.SEGMENT_WRITE_KEY,
      });
    },
    onPassageEnter: async (passage, context) => {
      // Auto-track page views
      await EventTracking.page(passage.title);
    },
  },
};
```

## 2. Embed Plugin

### `packages/onboarding-extensions/src/embed/EmbedPlugin.ts`

```typescript
import type { EditorPlugin } from '@whisker/editor-base';
import EmbedPanel from './EmbedPanel.svelte';
import EmbedGenerator from './EmbedGenerator';

export const embedPlugin: EditorPlugin = {
  name: 'embed',
  version: '1.0.0',
  description: 'Generate embed codes for onboarding flows',

  ui: {
    sidebar: EmbedPanel,
  },

  // Custom methods
  generateIframe: (storyId: string, options: EmbedOptions) => {
    return EmbedGenerator.iframe(storyId, options);
  },

  generateScript: (storyId: string, options: EmbedOptions) => {
    return EmbedGenerator.script(storyId, options);
  },

  generateCustomDomain: (storyId: string, domain: string) => {
    return EmbedGenerator.customDomain(storyId, domain);
  },
};
```

## 3. Team Plugin

### `packages/onboarding-extensions/src/team/TeamPlugin.ts`

```typescript
import type { EditorPlugin } from '@whisker/editor-base';
import TeamPanel from './TeamPanel.svelte';
import RoleManager from './RoleManager';

export const teamPlugin: EditorPlugin = {
  name: 'team',
  version: '1.0.0',
  description: 'Team collaboration and permissions',

  ui: {
    sidebar: TeamPanel,
  },

  runtime: {
    onInit: async (context) => {
      // Check user permissions
      const permissions = await RoleManager.getUserPermissions(context.userId);
      context.storyState.permissions = permissions;
    },
  },
};
```

---

# Main Application

## apps/onboardflow/src/App.svelte

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { pluginManager } from '@whisker/editor-base';
  import {
    MenuBar,
    GraphView,
    PassageList,
    PropertiesPanel,
  } from '@whisker/editor-base';
  import '@whisker/shared-ui/styles';

  // OnboardFlow plugins
  import {
    analyticsPlugin,
    embedPlugin,
    teamPlugin,
    integrations Plugin,
    brandingPlugin,
  } from 'onboarding-extensions';

  // OnboardFlow components
  import Navbar from './components/Navbar.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import BillingPanel from './components/BillingPanel.svelte';

  // Auth
  import { user, subscription } from './stores/auth';

  onMount(async () => {
    // Register OnboardFlow plugins
    await pluginManager.register(analyticsPlugin);
    await pluginManager.register(embedPlugin);
    await pluginManager.register(teamPlugin);
    await pluginManager.register(integrationsPlugin);
    await pluginManager.register(brandingPlugin);

    // Initialize
    await pluginManager.initialize();

    console.log('OnboardFlow initialized');
  });
</script>

<div class="onboardflow-app">
  <Navbar {$user} {$subscription} />

  <div class="app-layout">
    <Sidebar />

    <main class="main-content">
      <!-- Whisker editor components -->
      <MenuBar />
      <div class="editor-layout">
        <PassageList />
        <GraphView />
        <PropertiesPanel />
      </div>
    </main>

    <aside class="right-panel">
      <BillingPanel {$subscription} />
      <!-- Analytics, embed, team panels rendered by plugins -->
    </aside>
  </div>
</div>

<style>
  /* OnboardFlow custom styling */
  .onboardflow-app {
    --brand-primary: #6366f1;
    --brand-secondary: #8b5cf6;
    /* ... custom theme */
  }
</style>
```

---

# Backend Architecture

## Supabase Stack

### Database Schema

```sql
-- Users (Supabase Auth)
-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  story_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Team Members
CREATE TABLE team_members (
  team_id UUID REFERENCES teams(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL, -- owner, admin, editor, viewer
  PRIMARY KEY (team_id, user_id)
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL, -- free, pro, enterprise
  status TEXT NOT NULL,
  current_period_end TIMESTAMP
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

-- Embed Configurations
CREATE TABLE embed_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  embed_type TEXT NOT NULL, -- iframe, script, custom-domain
  config JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Row Level Security (RLS)

```sql
-- Users can only read/write their own projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own projects"
ON projects
FOR ALL
USING (auth.uid() = user_id);

-- Team members can read team projects
CREATE POLICY "Team members can read team projects"
ON projects
FOR SELECT
USING (
  user_id IN (
    SELECT user_id FROM team_members
    WHERE team_id = projects.team_id
  )
);
```

## API Routes

### `packages/onboardflow-backend/src/api/projects.ts`

```typescript
import { supabase } from '../database';

export async function createProject(userId: string, name: string, storyData: any) {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name,
      story_data: storyData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProjects(userId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateProject(projectId: string, updates: any) {
  const { data, error } = await supabase
    .from('projects')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

---

# Billing Integration

## Stripe Setup

### `apps/onboardflow/src/lib/billing/stripe.ts`

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createCheckoutSession(userId: string, priceId: string) {
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.PUBLIC_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.PUBLIC_URL}/pricing`,
    metadata: {
      user_id: userId,
    },
  });

  return session.url;
}

export async function handleWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      // Create subscription record
      break;
    case 'customer.subscription.updated':
      // Update subscription status
      break;
    case 'customer.subscription.deleted':
      // Cancel subscription
      break;
  }
}
```

## Pricing Tiers

```typescript
export const PRICING_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      '1 onboarding flow',
      '100 completions/month',
      'Basic analytics',
      'Community support',
    ],
    limits: {
      flows: 1,
      completions: 100,
      teamMembers: 1,
    },
  },
  pro: {
    name: 'Pro',
    price: 49,
    priceId: 'price_xxx',
    features: [
      'Unlimited flows',
      '10,000 completions/month',
      'Advanced analytics',
      'Custom branding',
      'Email support',
    ],
    limits: {
      flows: Infinity,
      completions: 10000,
      teamMembers: 5,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Custom',
    features: [
      'Everything in Pro',
      'Unlimited completions',
      'Custom domain',
      'SSO',
      'Priority support',
      'SLA',
    ],
    limits: {
      flows: Infinity,
      completions: Infinity,
      teamMembers: Infinity,
    },
  },
};
```

---

# Deployment

## Vercel Deployment

### `vercel.json`

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "apps/onboardflow/dist",
  "framework": "vite",
  "env": {
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "VITE_STRIPE_PUBLIC_KEY": "@stripe-public-key",
    "VITE_SEGMENT_WRITE_KEY": "@segment-write-key"
  }
}
```

## Environment Variables

```bash
# .env.example
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_STRIPE_PUBLIC_KEY=pk_test_xxx
VITE_SEGMENT_WRITE_KEY=xxx

# Backend
SUPABASE_SERVICE_KEY=xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

# Development Workflow

## 1. Local Development

```bash
# Clone OnboardFlow repo
git clone git@github.com:yourorg/onboardflow.git
cd onboardflow

# Install dependencies (installs @whisker/* from npm)
pnpm install

# Start development
pnpm dev

# Visit http://localhost:5173
```

## 2. Package Updates

When @whisker packages are updated:

```bash
# Update to latest
pnpm update @whisker/core-ts @whisker/editor-base @whisker/shared-ui

# Or specific version
pnpm add @whisker/core-ts@0.2.0
```

## 3. Testing

```bash
# Test frontend
pnpm test

# Test backend
cd packages/onboardflow-backend
pnpm test

# E2E tests
pnpm test:e2e
```

---

# Key Differences from WriteWhisker

| Feature | WriteWhisker (Open Source) | OnboardFlow (Proprietary) |
|---------|---------------------------|---------------------------|
| **License** | AGPL-3.0 | Proprietary |
| **Use Case** | General IF authoring | SaaS onboarding flows |
| **Backend** | Browser-only | Supabase + Stripe |
| **Plugins** | IF extensions (inventory, combat) | Analytics, embed, team |
| **Auth** | None | Supabase Auth + SSO |
| **Billing** | Free | Stripe subscriptions |
| **Analytics** | Basic | Segment, Amplitude, etc. |
| **Deployment** | Self-hosted or static | Vercel + CDN |
| **Team Features** | No | Yes (collaboration, permissions) |
| **White Label** | No | Yes (custom branding) |

---

# Success Metrics

After OnboardFlow launch:

- ✅ All @whisker packages install from npm
- ✅ OnboardFlow plugins integrate smoothly
- ✅ Backend API functional
- ✅ Stripe billing works
- ✅ Analytics tracking operational
- ✅ Team collaboration features work
- ✅ Embed generation functional
- ✅ Performance acceptable
- ✅ No breaking changes from whisker updates

---

# Maintenance

## Staying Up to Date

```bash
# Check for updates
pnpm outdated @whisker/core-ts @whisker/editor-base

# Update to latest compatible
pnpm update @whisker/*

# Or update to specific version
pnpm add @whisker/core-ts@^0.3.0
```

## Handling Breaking Changes

When @whisker packages have breaking changes:

1. Review CHANGELOG
2. Read migration guide
3. Update OnboardFlow code
4. Test thoroughly
5. Deploy

---

**Timeline**: Start development Week 8 (after npm publish)
**Estimated Build Time**: 8-12 weeks for MVP
**Tech Stack**: Svelte 5, SvelteKit, Supabase, Stripe, Vercel
**Dependencies**: @whisker/* packages (from npm)
