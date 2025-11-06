import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { pluginManager } from '../plugins/PluginManager';
import { pluginStoreActions } from '../plugins';
import type { EditorPlugin } from '../plugins/types';
import PluginManagerPanel from './PluginManagerPanel.svelte';

describe('PluginManagerPanel', () => {
  beforeEach(() => {
    pluginManager.reset();
  });

  it('should render empty state when no plugins', () => {
    render(PluginManagerPanel);
    expect(screen.getByText('No plugins installed')).toBeInTheDocument();
  });

  it('should render plugin list when plugins are registered', async () => {
    const plugin: EditorPlugin = {
      name: 'test-plugin',
      version: '1.0.0',
      author: 'Test Author',
      description: 'A test plugin for testing',
    };

    await pluginStoreActions.register(plugin);

    render(PluginManagerPanel);

    expect(screen.getByText('test-plugin')).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByText('by Test Author')).toBeInTheDocument();
    expect(screen.getByText('A test plugin for testing')).toBeInTheDocument();
  });

  it('should show plugin features', async () => {
    const plugin: EditorPlugin = {
      name: 'test-plugin',
      version: '1.0.0',
      nodeTypes: [
        { type: 'item', label: 'Item', icon: '📦', color: '#ff0000' },
        { type: 'character', label: 'Character', icon: '👤', color: '#00ff00' },
      ],
      actions: [
        {
          type: 'test-action',
          label: 'Test Action',
          execute: async () => {},
        },
      ],
      conditions: [
        {
          type: 'test-condition',
          label: 'Test Condition',
          evaluate: () => true,
        },
      ],
    };

    await pluginStoreActions.register(plugin);

    render(PluginManagerPanel);

    expect(screen.getByText('2 passage types')).toBeInTheDocument();
    expect(screen.getByText('1 actions')).toBeInTheDocument();
    expect(screen.getByText('1 conditions')).toBeInTheDocument();
  });

  it('should show UI extensions badge', async () => {
    const MockComponent = {} as any;

    const plugin: EditorPlugin = {
      name: 'test-plugin',
      version: '1.0.0',
      ui: {
        sidebar: MockComponent,
      },
    };

    await pluginStoreActions.register(plugin);

    render(PluginManagerPanel);

    expect(screen.getByText('UI extensions')).toBeInTheDocument();
  });

  it('should show runtime hooks badge', async () => {
    const plugin: EditorPlugin = {
      name: 'test-plugin',
      version: '1.0.0',
      runtime: {
        onInit: () => {},
      },
    };

    await pluginStoreActions.register(plugin);

    render(PluginManagerPanel);

    expect(screen.getByText('Runtime hooks')).toBeInTheDocument();
  });
});
