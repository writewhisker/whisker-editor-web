# Supabase Backend Setup Guide

## Overview
This guide will help you set up Supabase as the backend for Whisker Editor, providing authentication, database, and cloud storage.

## Prerequisites
- Supabase account (free tier available)
- Node.js 18+ installed
- Basic understanding of SQL

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new organization (or use existing)
4. Click "New Project"
5. Fill in details:
   - **Name:** whisker-editor
   - **Database Password:** (save this securely!)
   - **Region:** Choose closest to your users
   - **Pricing Plan:** Free (or Pro for production)

## Step 2: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

## Step 3: Configure Environment Variables

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these values from:
- Settings → API → Project URL
- Settings → API → Project API keys → anon public

## Step 4: Initialize Supabase Client

Create `src/lib/services/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## Step 5: Database Schema

Run these SQL commands in Supabase SQL Editor:

### Users Table (extends Supabase auth.users)
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles are viewable by everyone, but only users can update their own
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Stories Table
```sql
CREATE TABLE public.stories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Users can view their own stories
CREATE POLICY "Users can view own stories"
  ON public.stories FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own stories
CREATE POLICY "Users can create stories"
  ON public.stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own stories
CREATE POLICY "Users can update own stories"
  ON public.stories FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own stories
CREATE POLICY "Users can delete own stories"
  ON public.stories FOR DELETE
  USING (auth.uid() = user_id);

-- Public stories are viewable by everyone
CREATE POLICY "Public stories are viewable by everyone"
  ON public.stories FOR SELECT
  USING (is_public = true);

-- Create index for faster queries
CREATE INDEX stories_user_id_idx ON public.stories(user_id);
CREATE INDEX stories_updated_at_idx ON public.stories(updated_at DESC);
```

### Story Collaborators Table
```sql
CREATE TYPE collaboration_role AS ENUM ('viewer', 'commenter', 'editor', 'owner');

CREATE TABLE public.story_collaborators (
  story_id UUID REFERENCES public.stories ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  role collaboration_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (story_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.story_collaborators ENABLE ROW LEVEL SECURITY;

-- Users can view collaborations they're part of
CREATE POLICY "Users can view their collaborations"
  ON public.story_collaborators FOR SELECT
  USING (auth.uid() = user_id);

-- Story owners can manage collaborators
CREATE POLICY "Story owners can manage collaborators"
  ON public.story_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE id = story_id AND user_id = auth.uid()
    )
  );
```

### Story Comments Table
```sql
CREATE TABLE public.story_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  story_id UUID REFERENCES public.stories ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  passage_id TEXT,
  content TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;

-- Users with access to story can view comments
CREATE POLICY "Story collaborators can view comments"
  ON public.story_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE id = story_id
      AND (user_id = auth.uid() OR is_public = true)
    )
    OR EXISTS (
      SELECT 1 FROM public.story_collaborators
      WHERE story_id = story_comments.story_id
      AND user_id = auth.uid()
    )
  );

-- Users with comment/edit access can create comments
CREATE POLICY "Collaborators can create comments"
  ON public.story_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE id = story_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.story_collaborators
      WHERE story_id = story_comments.story_id
      AND user_id = auth.uid()
      AND role IN ('commenter', 'editor', 'owner')
    )
  );
```

## Step 6: Configure Authentication Providers

### Email/Password Auth
Already enabled by default in Supabase.

### GitHub OAuth
1. Create GitHub OAuth App:
   - Go to GitHub → Settings → Developer settings → OAuth Apps
   - Click "New OAuth App"
   - **Application name:** Whisker Editor
   - **Homepage URL:** `https://your-domain.com`
   - **Authorization callback URL:** `https://your-project.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret

2. Configure in Supabase:
   - Authentication → Providers → GitHub
   - Enable GitHub provider
   - Paste Client ID and Client Secret
   - Click Save

### Google OAuth
1. Create Google OAuth App:
   - Go to Google Cloud Console
   - Create new project (or use existing)
   - Enable Google+ API
   - Create OAuth 2.0 Client ID
   - **Authorized redirect URIs:** `https://your-project.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret

2. Configure in Supabase:
   - Authentication → Providers → Google
   - Enable Google provider
   - Paste Client ID and Client Secret
   - Click Save

## Step 7: Storage Buckets

Create storage buckets for assets:

```sql
-- Create story assets bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-assets', 'story-assets', true);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'story-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own and public assets
CREATE POLICY "Users can view assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'story-assets'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.stories
      WHERE id::text = (storage.foldername(name))[1]
      AND is_public = true
    )
  )
);
```

## Step 8: Implement Auth Service

Create `src/lib/services/supabase/auth.ts`:

```typescript
import { supabase } from './client';
import type { User, Session } from '@supabase/supabase-js';

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signInWithGitHub() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChanged((event, session) => {
    callback(session);
  });
}
```

## Step 9: Implement Story Service

Create `src/lib/services/supabase/stories.ts`:

```typescript
import { supabase } from './client';
import type { Story } from '../../models/Story';

export async function saveStory(story: Story, userId: string) {
  const { data, error } = await supabase
    .from('stories')
    .upsert({
      id: story.metadata.ifid,
      user_id: userId,
      title: story.metadata.title,
      description: story.metadata.description,
      data: story.serialize(),
      updated_at: new Date().toISOString(),
      last_opened_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function loadStory(storyId: string) {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .single();

  if (error) throw error;
  return data;
}

export async function listUserStories(userId: string) {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('user_id', userId)
    .order('last_opened_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function deleteStory(storyId: string) {
  const { error } = await supabase
    .from('stories')
    .delete()
    .eq('id', storyId);

  if (error) throw error;
}
```

## Step 10: Real-time Collaboration

Enable real-time subscriptions:

```typescript
import { supabase } from './client';

export function subscribeToStoryChanges(
  storyId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`story:${storyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'stories',
        filter: `id=eq.${storyId}`,
      },
      callback
    )
    .subscribe();
}

export function subscribeToComments(
  storyId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`comments:${storyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'story_comments',
        filter: `story_id=eq.${storyId}`,
      },
      callback
    )
    .subscribe();
}
```

## Step 11: Deploy & Configure

### Development
```bash
cp .env.example .env.local
# Add your Supabase credentials
npm run dev
```

### Production (Vercel)
1. Connect GitHub repo to Vercel
2. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy

### Update Supabase URLs
After deploying, update callback URLs in:
- Supabase Dashboard → Authentication → URL Configuration
- GitHub OAuth App settings
- Google OAuth App settings

## Security Checklist

- ✅ Row Level Security enabled on all tables
- ✅ Policies restrict access appropriately
- ✅ Email confirmation enabled (optional but recommended)
- ✅ Password requirements configured
- ✅ Rate limiting enabled
- ✅ CORS properly configured
- ✅ API keys kept secret (use environment variables)
- ✅ Database backups enabled (automatic in Supabase)

## Monitoring

- **Dashboard:** Monitor usage in Supabase Dashboard
- **Logs:** Check Auth logs for failed attempts
- **Alerts:** Set up email alerts for unusual activity
- **Performance:** Monitor query performance in SQL editor

## Support & Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [Supabase GitHub](https://github.com/supabase/supabase)

## Next Steps

1. Integrate auth service into components
2. Implement cloud save/load functionality
3. Add real-time collaboration features
4. Set up user dashboard
5. Configure production deployment
