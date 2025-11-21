#!/usr/bin/env node

/**
 * Whisker CLI Entry Point
 *
 * Main executable for the Whisker CLI tool.
 */

import { createCLI } from './index.js';

async function main() {
  const cli = createCLI();

  // Dynamically import and register commands
  try {
    const [init, build, deploy, migrate] = await Promise.all([
      import('@writewhisker/cli-init'),
      import('@writewhisker/cli-build'),
      import('@writewhisker/cli-deploy'),
      import('@writewhisker/cli-migrate'),
    ]);

    cli.registerCommand(init.initCommand);
    cli.registerCommand(build.buildCommand);
    cli.registerCommand(deploy.deployCommand);
    cli.registerCommand(migrate.migrateCommand);
  } catch (error) {
    console.error('Error loading CLI commands:', error);
    process.exit(1);
  }

  // Execute CLI
  const args = process.argv.slice(2);
  await cli.execute(args);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
