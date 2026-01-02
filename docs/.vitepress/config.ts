import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Whisker Language',
  description: 'Interactive fiction language specification and tools',

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/getting-started/' },
      { text: 'Tutorials', link: '/tutorials/' },
      { text: 'API', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
      { text: 'Migration', link: '/migration/' },
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Installation', link: '/getting-started/installation' },
            { text: 'Quick Start', link: '/getting-started/quick-start' },
            { text: 'Editor Setup', link: '/getting-started/editor-setup' },
          ],
        },
      ],
      '/tutorials/': [
        {
          text: 'Beginner',
          collapsed: false,
          items: [
            { text: 'Your First Story', link: '/tutorials/beginner/01-first-story' },
            { text: 'Adding Choices', link: '/tutorials/beginner/02-adding-choices' },
            { text: 'Using Variables', link: '/tutorials/beginner/03-using-variables' },
            { text: 'Conditional Content', link: '/tutorials/beginner/04-conditional-content' },
            { text: 'Linking Passages', link: '/tutorials/beginner/05-linking-passages' },
          ],
        },
        {
          text: 'Intermediate',
          collapsed: false,
          items: [
            { text: 'Advanced Flow Control', link: '/tutorials/intermediate/01-advanced-flow' },
            { text: 'Data Structures', link: '/tutorials/intermediate/02-data-structures' },
            { text: 'Functions', link: '/tutorials/intermediate/03-functions' },
            { text: 'Styling', link: '/tutorials/intermediate/04-styling' },
            { text: 'Adding Media', link: '/tutorials/intermediate/05-media' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'TypeScript API', link: '/api/typescript/' },
            { text: 'Lua API', link: '/api/lua/' },
          ],
        },
      ],
      '/migration/': [
        {
          text: 'Migration Guides',
          items: [
            { text: 'From Twine', link: '/migration/from-twine' },
            { text: 'From Ink', link: '/migration/from-ink' },
            { text: 'From ChoiceScript', link: '/migration/from-choicescript' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Basic',
          collapsed: false,
          items: [
            { text: 'Hello World', link: '/examples/basic/hello-world' },
            { text: 'Simple Choices', link: '/examples/basic/simple-choices' },
            { text: 'Basic Variables', link: '/examples/basic/basic-variables' },
            { text: 'Conditionals', link: '/examples/basic/conditionals' },
            { text: 'Text Formatting', link: '/examples/basic/text-formatting' },
            { text: 'Random Events', link: '/examples/basic/random-events' },
            { text: 'Simple Quiz', link: '/examples/basic/simple-quiz' },
            { text: 'Passage Links', link: '/examples/basic/passage-links' },
            { text: 'Counter Game', link: '/examples/basic/counter-game' },
            { text: 'Yes/No Questions', link: '/examples/basic/yes-no' },
            { text: 'Story Branching', link: '/examples/basic/story-branching' },
            { text: 'Simple Timer', link: '/examples/basic/simple-timer' },
          ],
        },
        {
          text: 'Intermediate',
          collapsed: false,
          items: [
            { text: 'Inventory System', link: '/examples/intermediate/inventory-system' },
            { text: 'Dialogue Tree', link: '/examples/intermediate/dialogue-tree' },
            { text: 'Character Stats', link: '/examples/intermediate/character-stats' },
            { text: 'Shop System', link: '/examples/intermediate/shop-system' },
            { text: 'Quest Tracker', link: '/examples/intermediate/quest-tracker' },
            { text: 'Time System', link: '/examples/intermediate/time-system' },
            { text: 'Relationship Tracker', link: '/examples/intermediate/relationship-tracker' },
            { text: 'Map Exploration', link: '/examples/intermediate/map-exploration' },
          ],
        },
        {
          text: 'Advanced',
          collapsed: true,
          items: [
            { text: 'Combat System', link: '/examples/advanced/combat-system' },
            { text: 'State Machine', link: '/examples/advanced/state-machine' },
            { text: 'Crafting System', link: '/examples/advanced/crafting-system' },
            { text: 'Procedural Content', link: '/examples/advanced/procedural-content' },
            { text: 'Puzzle Mechanics', link: '/examples/advanced/puzzle-mechanics' },
            { text: 'Achievement System', link: '/examples/advanced/achievement-system' },
          ],
        },
        {
          text: 'Showcase',
          collapsed: true,
          items: [
            { text: 'Mystery Game', link: '/examples/showcase/mystery-game' },
            { text: 'Text Adventure', link: '/examples/showcase/text-adventure' },
            { text: 'Visual Novel', link: '/examples/showcase/visual-novel' },
            { text: 'RPG Demo', link: '/examples/showcase/rpg-demo' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/writewhisker/whisker-editor-web' },
    ],

    search: {
      provider: 'local',
    },

    footer: {
      message: 'Released under the AGPL-3.0 License.',
      copyright: 'Copyright 2024-present WriteWhisker',
    },

    editLink: {
      pattern: 'https://github.com/writewhisker/whisker-editor-web/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },

  markdown: {
    lineNumbers: true,
  },
});
