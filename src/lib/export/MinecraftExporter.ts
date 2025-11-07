/**
 * Minecraft Datapack Exporter
 *
 * Exports stories to Minecraft datapack format.
 * Creates NPCs, dialogue systems, and quest structures.
 */

import type { Story } from '@whisker/core-ts';
import type { Passage } from '@whisker/core-ts';
import JSZip from 'jszip';

export interface MinecraftExportOptions {
  datapackName: string;
  description: string;
  minecraftVersion: string; // e.g., "1.20"
  includeNPCs: boolean;
  includeDialogue: boolean;
  includeCommands: boolean;
}

export class MinecraftExporter {
  /**
   * Export story to Minecraft datapack format
   */
  static async export(story: Story, options: MinecraftExportOptions): Promise<Blob> {
    const zip = new JSZip();

    // Create datapack structure
    const datapackName = this.sanitizeName(options.datapackName || story.metadata.title);

    // pack.mcmeta (datapack metadata)
    const packMeta = {
      pack: {
        pack_format: this.getPackFormat(options.minecraftVersion),
        description: options.description || `Story: ${story.metadata.title}`,
      },
    };
    zip.file('pack.mcmeta', JSON.stringify(packMeta, null, 2));

    // Create data folder
    const dataFolder = zip.folder('data')!;
    const namespaceFolder = dataFolder.folder(datapackName)!;

    // Create functions folder
    const functionsFolder = namespaceFolder.folder('functions')!;

    // Generate load function (runs once when datapack loads)
    const loadFunction = this.generateLoadFunction(story);
    functionsFolder.file('load.mcfunction', loadFunction);

    // Generate tick function (runs every game tick)
    const tickFunction = this.generateTickFunction(story);
    functionsFolder.file('tick.mcfunction', tickFunction);

    // Generate dialogue functions for each passage
    const dialogueFolder = functionsFolder.folder('dialogue')!;
    for (const passage of story.passages.values()) {
      const dialogueFunction = this.generateDialogueFunction(passage, story);
      const passageName = this.sanitizeName(passage.title);
      dialogueFolder.file(`${passageName}.mcfunction`, dialogueFunction);
    }

    // Generate choice functions
    const choicesFolder = functionsFolder.folder('choices')!;
    for (const passage of story.passages.values()) {
      if (passage.choices && passage.choices.length > 0) {
        const choiceFunction = this.generateChoiceFunction(passage, story);
        const passageName = this.sanitizeName(passage.title);
        choicesFolder.file(`${passageName}.mcfunction`, choiceFunction);
      }
    }

    // Create function tags for load/tick
    const functionsTagFolder = namespaceFolder.folder('tags')!.folder('functions')!;
    functionsTagFolder.file(
      'load.json',
      JSON.stringify({
        values: [`${datapackName}:load`],
      }, null, 2)
    );
    functionsTagFolder.file(
      'tick.json',
      JSON.stringify({
        values: [`${datapackName}:tick`],
      }, null, 2)
    );

    // Generate README
    const readme = this.generateReadme(story, options);
    zip.file('README.txt', readme);

    // Generate the ZIP file
    const blob = await zip.generateAsync({ type: 'blob' });
    return blob;
  }

  /**
   * Get pack format number based on Minecraft version
   */
  private static getPackFormat(version: string): number {
    // Pack format mapping for Minecraft versions
    const versionMap: Record<string, number> = {
      '1.20': 15,
      '1.19': 10,
      '1.18': 9,
      '1.17': 7,
      '1.16': 6,
    };

    return versionMap[version] || 15; // Default to latest
  }

  /**
   * Sanitize name for Minecraft namespaces (lowercase, no spaces)
   */
  private static sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Generate load function (initialization)
   */
  private static generateLoadFunction(story: Story): string {
    const startPassage = story.passages.get(story.startPassage);
    const startName = startPassage ? this.sanitizeName(startPassage.title) : 'start';

    return `# ${story.metadata.title} - Load Function
# This runs once when the datapack is loaded

# Display welcome message
tellraw @a {"text":"[Story] ${story.metadata.title} loaded!","color":"green","bold":true}
tellraw @a {"text":"By ${story.metadata.author}","color":"gray","italic":true}

# Initialize scoreboard objectives
scoreboard objectives add story_progress dummy "Story Progress"
scoreboard objectives add story_choice dummy "Story Choice"

# Set all players to start of story
scoreboard players set @a story_progress 0

# Start the story
function ${this.sanitizeName(story.metadata.title)}:dialogue/${startName}
`;
  }

  /**
   * Generate tick function (runs every tick)
   */
  private static generateTickFunction(story: Story): string {
    return `# ${story.metadata.title} - Tick Function
# This runs every game tick (20 times per second)

# Check for player interactions (right-click detection, etc.)
# This is where you'd add custom interaction logic
`;
  }

  /**
   * Generate dialogue function for a passage
   */
  private static generateDialogueFunction(passage: Passage, story: Story): string {
    const commands: string[] = [];

    commands.push(`# Dialogue: ${passage.title}`);
    commands.push('');

    // Clear chat and display title
    commands.push(`title @a title {"text":"${this.escapeText(passage.title)}","color":"gold","bold":true}`);
    commands.push('');

    // Split content into lines and display
    const contentLines = passage.content.split('\n').filter(line => line.trim());
    contentLines.forEach((line, index) => {
      const escapedLine = this.escapeText(line);
      commands.push(`tellraw @a {"text":"${escapedLine}","color":"white"}`);
    });

    commands.push('');

    // Display choices if any
    if (passage.choices && passage.choices.length > 0) {
      commands.push('# Display choices');
      commands.push(`tellraw @a {"text":"\\n","color":"white"}`);
      commands.push(`tellraw @a {"text":"What do you do?","color":"yellow","bold":true}`);

      passage.choices.forEach((choice, index) => {
        const targetPassage = story.passages.get(choice.target);
        if (targetPassage) {
          const choiceNumber = index + 1;
          const targetName = this.sanitizeName(targetPassage.title);
          const escapedChoice = this.escapeText(choice.text);

          // Create clickable choice
          commands.push(
            `tellraw @a {"text":"[${choiceNumber}] ${escapedChoice}","color":"aqua","clickEvent":{"action":"run_command","value":"/function ${this.sanitizeName(story.metadata.title)}:dialogue/${targetName}"},"hoverEvent":{"action":"show_text","contents":"Click to choose"}}`
          );
        }
      });
    } else {
      // No choices means this is an ending
      commands.push('');
      commands.push('# Story ending');
      commands.push(`tellraw @a {"text":"\\n=== THE END ===","color":"gold","bold":true}`);
      commands.push('scoreboard players set @a story_progress -1');
    }

    return commands.join('\n');
  }

  /**
   * Generate choice function for a passage
   */
  private static generateChoiceFunction(passage: Passage, story: Story): string {
    const commands: string[] = [];
    commands.push(`# Choice handler: ${passage.title}`);
    commands.push('');

    // Add choice selection logic
    passage.choices?.forEach((choice, index) => {
      const targetPassage = story.passages.get(choice.target);
      if (targetPassage) {
        const choiceNumber = index + 1;
        const targetName = this.sanitizeName(targetPassage.title);
        commands.push(`# Choice ${choiceNumber}: ${choice.text}`);
        commands.push(`execute as @a[scores={story_choice=${choiceNumber}}] run function ${this.sanitizeName(story.metadata.title)}:dialogue/${targetName}`);
        commands.push('');
      }
    });

    return commands.join('\n');
  }

  /**
   * Escape text for Minecraft JSON
   */
  private static escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '')
      .replace(/\t/g, '    ');
  }

  /**
   * Generate README file with installation instructions
   */
  private static generateReadme(story: Story, options: MinecraftExportOptions): string {
    return `${story.metadata.title}
${'='.repeat(story.metadata.title.length)}

A Minecraft story datapack created with Whisker Editor.

Author: ${story.metadata.author}
Version: ${story.metadata.version}
Minecraft Version: ${options.minecraftVersion}

INSTALLATION:
-------------
1. Locate your Minecraft saves folder:
   - Windows: %appdata%\\.minecraft\\saves\\
   - Mac: ~/Library/Application Support/minecraft/saves/
   - Linux: ~/.minecraft/saves/

2. Open your world folder (e.g., "My World")

3. Copy this entire datapack folder into the "datapacks" folder
   If the datapacks folder doesn't exist, create it.

4. Launch Minecraft and load your world

5. Run this command in chat:
   /reload

6. The story will automatically start!

GAMEPLAY:
---------
- Click on the colored text options to make choices
- Follow the story by reading the chat messages
- The story will guide you through your adventure

TROUBLESHOOTING:
----------------
- If the datapack doesn't load, make sure you're using Minecraft ${options.minecraftVersion} or later
- Run /datapack list to see if the datapack is loaded
- Run /reload to reload all datapacks

Created with Whisker Editor - Kids Mode
https://github.com/writewhisker/whisker-editor-web

Enjoy your story adventure!
`;
  }

  /**
   * Get suggested filename for the export
   */
  static getSuggestedFilename(story: Story): string {
    return `${this.sanitizeName(story.metadata.title)}_datapack.zip`;
  }
}
