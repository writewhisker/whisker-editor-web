/**
 * CLI Init Command
 *
 * Project scaffolding and initialization for Whisker Editor.
 */

import type { Command, CommandContext } from './types.js';
import { Story, Passage } from '@writewhisker/story-models';

/**
 * Project template type
 */
export type TemplateType = 'basic' | 'interactive' | 'branching' | 'rpg' | 'visual-novel';

/**
 * Project configuration
 */
export interface ProjectConfig {
  name: string;
  template: TemplateType;
  author?: string;
  description?: string;
  typescript?: boolean;
  git?: boolean;
}

/**
 * Template definitions
 */
export const templates: Record<TemplateType, { name: string; description: string; passages: number }> = {
  basic: {
    name: 'Basic Story',
    description: 'Simple linear story template',
    passages: 3,
  },
  interactive: {
    name: 'Interactive Story',
    description: 'Story with choices and branching',
    passages: 5,
  },
  branching: {
    name: 'Branching Narrative',
    description: 'Complex branching story with multiple endings',
    passages: 8,
  },
  rpg: {
    name: 'RPG Story',
    description: 'RPG-style story with stats and inventory',
    passages: 6,
  },
  'visual-novel': {
    name: 'Visual Novel',
    description: 'Visual novel template with characters and scenes',
    passages: 7,
  },
};

/**
 * Create a project from a template
 */
export async function createProject(config: ProjectConfig, targetDir: string): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');

  // Create project directory
  await fs.mkdir(targetDir, { recursive: true });

  // Create story file
  const story = generateStoryFromTemplate(config);
  const storyPath = path.join(targetDir, 'story.json');
  await fs.writeFile(storyPath, JSON.stringify(story.serialize(), null, 2));

  // Create package.json if TypeScript is enabled
  if (config.typescript) {
    const packageJson = generatePackageJson(config);
    const packagePath = path.join(targetDir, 'package.json');
    await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2));

    // Create tsconfig.json
    const tsconfig = generateTsConfig();
    const tsconfigPath = path.join(targetDir, 'tsconfig.json');
    await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  }

  // Create README
  const readme = generateReadme(config);
  const readmePath = path.join(targetDir, 'README.md');
  await fs.writeFile(readmePath, readme);

  // Initialize git if requested
  if (config.git) {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    await execAsync('git init', { cwd: targetDir });

    const gitignore = generateGitignore();
    const gitignorePath = path.join(targetDir, '.gitignore');
    await fs.writeFile(gitignorePath, gitignore);
  }
}

/**
 * Generate a story from a template
 */
export function generateStoryFromTemplate(config: ProjectConfig): Story {
  const passages = generatePassagesForTemplate(config.template);

  const story = new Story({
    metadata: {
      title: config.name,
      author: config.author,
      description: config.description,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      version: '1.0.0',
      tags: [],
      createdBy: 'cli-init',
      ifid: generateId(),
    },
    startPassage: passages[0].id,
  });

  // Add passages to the story using the Map
  passages.forEach(passage => {
    story.passages.set(passage.id, passage);
  });

  return story;
}

/**
 * Generate passages for a template
 */
function generatePassagesForTemplate(template: TemplateType): Passage[] {
  switch (template) {
    case 'basic':
      return generateBasicPassages();
    case 'interactive':
      return generateInteractivePassages();
    case 'branching':
      return generateBranchingPassages();
    case 'rpg':
      return generateRPGPassages();
    case 'visual-novel':
      return generateVisualNovelPassages();
    default:
      return generateBasicPassages();
  }
}

/**
 * Generate basic story passages
 */
function generateBasicPassages(): Passage[] {
  return [
    new Passage({
      id: generateId(),
      title: 'Start',
      content: 'Welcome to your story!\n\nThis is the beginning of your adventure.\n\n[[Continue->Middle]]',
      position: { x: 100, y: 100 },
    }),
    new Passage({
      id: generateId(),
      title: 'Middle',
      content: 'The story continues...\n\n[[Proceed->End]]',
      position: { x: 300, y: 100 },
    }),
    new Passage({
      id: generateId(),
      title: 'End',
      content: 'The end.\n\nThank you for reading!',
      position: { x: 500, y: 100 },
    }),
  ];
}

/**
 * Generate interactive story passages
 */
function generateInteractivePassages(): Passage[] {
  return [
    new Passage({
      id: generateId(),
      title: 'Start',
      content: 'You stand at a crossroads.\n\n[[Go left->Left Path]]\n[[Go right->Right Path]]',
      position: { x: 100, y: 200 },
    }),
    new Passage({
      id: generateId(),
      title: 'Left Path',
      content: 'You chose the left path. The road is dark and mysterious.\n\n[[Continue->Left End]]',
      position: { x: 300, y: 100 },
    }),
    new Passage({
      id: generateId(),
      title: 'Right Path',
      content: 'You chose the right path. The sun shines brightly ahead.\n\n[[Continue->Right End]]',
      position: { x: 300, y: 300 },
    }),
    new Passage({
      id: generateId(),
      title: 'Left End',
      content: 'You found a hidden treasure in the darkness!',
      position: { x: 500, y: 100 },
    }),
    new Passage({
      id: generateId(),
      title: 'Right End',
      content: 'You reached a beautiful meadow and found peace.',
      position: { x: 500, y: 300 },
    }),
  ];
}

/**
 * Generate branching narrative passages
 */
function generateBranchingPassages(): Passage[] {
  return [
    new Passage({
      id: generateId(),
      title: 'Start',
      content: 'Your adventure begins in a mysterious forest.\n\n[[Explore the forest->Forest]]\n[[Follow the river->River]]\n[[Climb the mountain->Mountain]]',
      position: { x: 100, y: 200 },
    }),
    new Passage({
      id: generateId(),
      title: 'Forest',
      content: 'Deep in the forest, you encounter a wise old hermit.\n\n[[Ask for guidance->Forest Good]]\n[[Continue alone->Forest Neutral]]',
      position: { x: 300, y: 100 },
    }),
    new Passage({
      id: generateId(),
      title: 'River',
      content: 'Following the river, you discover an ancient bridge.\n\n[[Cross the bridge->River Good]]\n[[Turn back->River Bad]]',
      position: { x: 300, y: 200 },
    }),
    new Passage({
      id: generateId(),
      title: 'Mountain',
      content: 'The mountain path is treacherous.\n\n[[Press onward->Mountain Good]]\n[[Seek shelter->Mountain Neutral]]',
      position: { x: 300, y: 300 },
    }),
    new Passage({
      id: generateId(),
      title: 'Forest Good',
      content: 'The hermit shares ancient wisdom. You feel enlightened.',
      position: { x: 500, y: 50 },
    }),
    new Passage({
      id: generateId(),
      title: 'Forest Neutral',
      content: 'You navigate the forest successfully on your own.',
      position: { x: 500, y: 150 },
    }),
    new Passage({
      id: generateId(),
      title: 'River Good',
      content: 'The bridge leads to a hidden village. You are welcomed warmly.',
      position: { x: 500, y: 200 },
    }),
    new Passage({
      id: generateId(),
      title: 'River Bad',
      content: 'You get lost returning to the forest.',
      position: { x: 500, y: 250 },
    }),
  ];
}

/**
 * Generate RPG story passages
 */
function generateRPGPassages(): Passage[] {
  return [
    new Passage({
      id: generateId(),
      title: 'Character Creation',
      content: 'Welcome, adventurer!\n\nChoose your class:\n\n[[Warrior->Warrior Start]]\n[[Mage->Mage Start]]\n[[Rogue->Rogue Start]]',
      position: { x: 100, y: 200 },
      tags: ['character-creation'],
    }),
    new Passage({
      id: generateId(),
      title: 'Warrior Start',
      content: 'As a warrior, you begin your quest with sword and shield.\n\n[[Enter the dungeon->Dungeon]]',
      position: { x: 300, y: 100 },
      tags: ['class:warrior'],
    }),
    new Passage({
      id: generateId(),
      title: 'Mage Start',
      content: 'As a mage, you wield powerful magic.\n\n[[Enter the dungeon->Dungeon]]',
      position: { x: 300, y: 200 },
      tags: ['class:mage'],
    }),
    new Passage({
      id: generateId(),
      title: 'Rogue Start',
      content: 'As a rogue, you rely on stealth and cunning.\n\n[[Enter the dungeon->Dungeon]]',
      position: { x: 300, y: 300 },
      tags: ['class:rogue'],
    }),
    new Passage({
      id: generateId(),
      title: 'Dungeon',
      content: 'You enter the dark dungeon. A monster blocks your path!\n\n[[Fight->Combat]]\n[[Flee->Escape]]',
      position: { x: 500, y: 200 },
      tags: ['combat-encounter'],
    }),
    new Passage({
      id: generateId(),
      title: 'Combat',
      content: 'You defeated the monster! Victory is yours!',
      position: { x: 700, y: 150 },
      tags: ['victory'],
    }),
  ];
}

/**
 * Generate visual novel passages
 */
function generateVisualNovelPassages(): Passage[] {
  return [
    new Passage({
      id: generateId(),
      title: 'Prologue',
      content: 'A new day begins at the academy.\n\n[[Continue->Morning]]',
      position: { x: 100, y: 200 },
      tags: ['scene:prologue'],
    }),
    new Passage({
      id: generateId(),
      title: 'Morning',
      content: 'You meet your classmates in the courtyard.\n\n[[Talk to Alice->Alice Route]]\n[[Talk to Bob->Bob Route]]',
      position: { x: 300, y: 200 },
      tags: ['scene:morning'],
    }),
    new Passage({
      id: generateId(),
      title: 'Alice Route',
      content: 'Alice: "Good morning! Ready for class?"\n\n[[Go to class together->Class Alice]]',
      position: { x: 500, y: 100 },
      tags: ['character:alice'],
    }),
    new Passage({
      id: generateId(),
      title: 'Bob Route',
      content: 'Bob: "Hey! Want to skip class today?"\n\n[[Skip class->Skip]]\n[[Decline->Class Bob]]',
      position: { x: 500, y: 300 },
      tags: ['character:bob'],
    }),
    new Passage({
      id: generateId(),
      title: 'Class Alice',
      content: 'You and Alice attend class together. A normal day at the academy.',
      position: { x: 700, y: 100 },
      tags: ['scene:class', 'route:alice'],
    }),
    new Passage({
      id: generateId(),
      title: 'Class Bob',
      content: 'You go to class alone. Bob looks disappointed.',
      position: { x: 700, y: 250 },
      tags: ['scene:class', 'route:bob'],
    }),
    new Passage({
      id: generateId(),
      title: 'Skip',
      content: 'You and Bob skip class and have an adventure in town!',
      position: { x: 700, y: 350 },
      tags: ['scene:town', 'route:bob'],
    }),
  ];
}

/**
 * Generate package.json
 */
function generatePackageJson(config: ProjectConfig): any {
  return {
    name: config.name.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    description: config.description || 'A Whisker interactive fiction story',
    main: 'story.json',
    scripts: {
      build: 'whisker build',
      deploy: 'whisker deploy',
    },
    author: config.author,
    license: 'MIT',
    devDependencies: {
      '@writewhisker/cli': '^0.1.0',
      typescript: '^5.7.2',
    },
  };
}

/**
 * Generate tsconfig.json
 */
function generateTsConfig(): any {
  return {
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules'],
  };
}

/**
 * Generate README
 */
function generateReadme(config: ProjectConfig): string {
  return `# ${config.name}

${config.description || 'An interactive fiction story created with Whisker Editor.'}

## Author

${config.author || 'Unknown'}

## Template

${templates[config.template].name}

## Getting Started

${config.typescript ? '1. Install dependencies:\n   \`\`\`\n   npm install\n   \`\`\`\n\n2. ' : '1. '}Edit your story in \`story.json\`

${config.typescript ? '3. ' : '2. '}Build your story:
   \`\`\`
   ${config.typescript ? 'npm run build' : 'whisker build'}
   \`\`\`

${config.typescript ? '4. ' : '3. '}Deploy your story:
   \`\`\`
   ${config.typescript ? 'npm run deploy' : 'whisker deploy'}
   \`\`\`

## Story Structure

This story contains ${templates[config.template].passages} passages using the "${templates[config.template].description}" template.

## License

MIT
`;
}

/**
 * Generate .gitignore
 */
function generateGitignore(): string {
  return `# Dependencies
node_modules/

# Build output
dist/
build/

# Environment files
.env
.env.local

# Editor files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db
`;
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Init command
 */
export const initCommand: Command = {
  name: 'init',
  description: 'Initialize a new Whisker project',
  options: [
    {
      name: 'name',
      alias: 'n',
      description: 'Project name',
      type: 'string',
      required: true,
    },
    {
      name: 'template',
      alias: 't',
      description: 'Template type (basic, interactive, branching, rpg, visual-novel)',
      type: 'string',
      default: 'basic',
    },
    {
      name: 'author',
      alias: 'a',
      description: 'Author name',
      type: 'string',
    },
    {
      name: 'typescript',
      description: 'Enable TypeScript',
      type: 'boolean',
      default: false,
    },
    {
      name: 'git',
      description: 'Initialize git repository',
      type: 'boolean',
      default: true,
    },
  ],
  execute: async (context: CommandContext) => {
    const { options, cwd } = context;
    const path = await import('path');

    const config: ProjectConfig = {
      name: options.name || 'my-story',
      template: (options.template || 'basic') as TemplateType,
      author: options.author,
      description: options.description,
      typescript: options.typescript || false,
      git: options.git !== false,
    };

    const targetDir = path.join(cwd, config.name.toLowerCase().replace(/\s+/g, '-'));

    console.log(`Creating project: ${config.name}`);
    console.log(`Template: ${templates[config.template].name}`);
    console.log(`Directory: ${targetDir}`);
    console.log('');

    await createProject(config, targetDir);

    console.log('✓ Project created successfully!');
    console.log('');
    console.log('Next steps:');
    console.log(`  cd ${path.basename(targetDir)}`);
    if (config.typescript) {
      console.log('  npm install');
    }
    console.log('  Edit story.json to customize your story');
    console.log(`  ${config.typescript ? 'npm run build' : 'whisker build'} to build`);
  },
};
