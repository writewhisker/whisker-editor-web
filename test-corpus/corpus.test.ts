/**
 * Cross-Platform Test Corpus - Vitest Integration
 *
 * Runs all YAML test cases against the TypeScript LuaEngine.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { LuaEngine } from '../packages/scripting/src/LuaEngine';

interface TestCase {
  name: string;
  description?: string;
  tags?: string[];
  wls: string;
  assertions: Array<{
    variable?: string;
    equals?: unknown;
    type?: string;
    greaterThan?: number;
    lessThan?: number;
    output?: { contains?: string; equals?: string };
    error?: { contains?: string; code?: string };
    list?: string;
    isEmpty?: boolean;
  }>;
  platforms?: {
    typescript?: { skip?: boolean; reason?: string };
    lua?: { skip?: boolean; reason?: string };
  };
}

function findYamlFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files.sort();
}

function parseTestFile(filePath: string): TestCase | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return yaml.parse(content) as TestCase;
  } catch {
    return null;
  }
}

const corpusDir = path.join(__dirname);
const testFiles = findYamlFiles(corpusDir);

describe('Cross-Platform Test Corpus', () => {
  // Group tests by category
  const categories = new Map<string, string[]>();

  for (const file of testFiles) {
    const relativePath = path.relative(corpusDir, file);
    const category = path.dirname(relativePath);
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(file);
  }

  for (const [category, files] of categories) {
    describe(category, () => {
      for (const file of files) {
        const testCase = parseTestFile(file);
        if (!testCase) {
          it.skip(`${path.basename(file)} (parse error)`, () => {});
          continue;
        }

        // Check if skipped for TypeScript
        if (testCase.platforms?.typescript?.skip) {
          it.skip(`${testCase.name} (${testCase.platforms.typescript.reason})`, () => {});
          continue;
        }

        it(testCase.name, () => {
          const engine = new LuaEngine();
          const result = engine.execute(testCase.wls);

          for (const assertion of testCase.assertions) {
            // Variable assertion
            if (assertion.variable !== undefined) {
              const actual = engine.getVariable(assertion.variable);

              if (assertion.equals !== undefined) {
                expect(actual).toBe(assertion.equals);
              }

              if (assertion.type !== undefined) {
                expect(typeof actual).toBe(assertion.type);
              }

              if (assertion.greaterThan !== undefined) {
                expect(actual).toBeGreaterThan(assertion.greaterThan);
              }

              if (assertion.lessThan !== undefined) {
                expect(actual).toBeLessThan(assertion.lessThan);
              }
            }

            // Output assertion
            if (assertion.output) {
              const outputText = result.output.join('\n');

              if (assertion.output.contains) {
                expect(outputText).toContain(assertion.output.contains);
              }

              if (assertion.output.equals) {
                expect(outputText.trim()).toBe(assertion.output.equals.trim());
              }
            }

            // Error assertion
            if (assertion.error) {
              const errorText = result.errors.join('\n');

              if (assertion.error.contains) {
                expect(errorText).toContain(assertion.error.contains);
              }

              if (assertion.error.code) {
                expect(errorText).toContain(assertion.error.code);
              }
            }
          }
        });
      }
    });
  }
});
