/**
 * Declaration Parsing
 *
 * Provides parsing for WLS story-level declarations:
 * - @audio: Audio track declarations
 * - @effect: Text effect declarations
 * - @external: External function declarations
 * - @delay: Delayed content blocks
 * - @every: Repeating content blocks
 */

import type { SourceSpan } from './types';
import type { ContentNode } from './ast';

// ============================================================================
// Audio Declarations
// ============================================================================

/**
 * Audio channel types
 */
export type AudioChannel = 'bgm' | 'sfx' | 'voice' | 'ambient';

/**
 * Audio declaration from @audio directive
 * Example: @audio bgm = "music/theme.mp3" loop channel:bgm
 */
export interface AudioDeclarationNode {
  type: 'audio_declaration';
  id: string;
  url: string;
  channel: AudioChannel;
  loop: boolean;
  volume: number;
  preload: boolean;
  location: SourceSpan;
}

/**
 * Parse an @audio declaration string
 * @param declaration - The declaration content after @audio
 * @param location - Source location for error reporting
 * @returns Parsed AudioDeclarationNode
 * @throws Error if declaration is invalid
 *
 * @example
 * parseAudioDeclaration('bgm = "music/theme.mp3" loop')
 * parseAudioDeclaration('click = "sounds/click.wav" channel:sfx volume:0.5')
 */
export function parseAudioDeclaration(
  declaration: string,
  location: SourceSpan
): AudioDeclarationNode {
  // Match: id = "url" [options...]
  const match = declaration.match(/^\s*(\w+)\s*=\s*"([^"]+)"(.*)$/);

  if (!match) {
    throw new Error(`Invalid @audio declaration: ${declaration}`);
  }

  const [, id, url, optionsStr] = match;

  const node: AudioDeclarationNode = {
    type: 'audio_declaration',
    id,
    url,
    channel: 'bgm', // Default channel
    loop: false,
    volume: 1.0,
    preload: false,
    location,
  };

  // Parse options
  const options = optionsStr.trim();

  if (/\bloop\b/i.test(options)) {
    node.loop = true;
  }

  if (/\bpreload\b/i.test(options)) {
    node.preload = true;
  }

  const volumeMatch = options.match(/volume[:\s]+([0-9.]+)/i);
  if (volumeMatch) {
    node.volume = parseFloat(volumeMatch[1]);
  }

  const channelMatch = options.match(/channel[:\s]+(\w+)/i);
  if (channelMatch) {
    const channel = channelMatch[1].toLowerCase();
    if (['bgm', 'sfx', 'voice', 'ambient'].includes(channel)) {
      node.channel = channel as AudioChannel;
    }
  }

  return node;
}

// ============================================================================
// Effect Declarations
// ============================================================================

/**
 * Text effect declaration from @effect directive
 * Example: @effect shake 500ms
 * Example: @effect typewriter speed:50 delay:100
 */
export interface EffectDeclarationNode {
  type: 'effect_declaration';
  name: string;
  duration: number | null;
  options: Record<string, string | number>;
  location: SourceSpan;
}

/**
 * Parse an @effect declaration string
 * @param declaration - The declaration content after @effect
 * @param location - Source location for error reporting
 * @returns Parsed EffectDeclarationNode
 * @throws Error if declaration is invalid
 *
 * @example
 * parseEffectDeclaration('shake')
 * parseEffectDeclaration('fade-in 1s')
 * parseEffectDeclaration('typewriter speed:100 delay:500')
 */
export function parseEffectDeclaration(
  declaration: string,
  location: SourceSpan
): EffectDeclarationNode {
  const parts = declaration.trim().split(/\s+/);

  if (parts.length === 0 || !parts[0]) {
    throw new Error(`Invalid @effect declaration: ${declaration}`);
  }

  const name = parts[0];
  const options: Record<string, string | number> = {};
  let duration: number | null = null;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    // Check for key:value format
    const keyValueMatch = part.match(/^(\w+):(.+)$/);
    if (keyValueMatch) {
      const [, key, value] = keyValueMatch;
      const numValue = parseFloat(value);
      options[key] = isNaN(numValue) ? value : numValue;
      continue;
    }

    // Check for duration format (e.g., "500ms", "1s", "2000")
    const durationMatch = part.match(/^(\d+(?:\.\d+)?)(ms|s)?$/);
    if (durationMatch) {
      const [, num, unit] = durationMatch;
      duration = parseFloat(num);
      if (unit === 's') {
        duration *= 1000;
      }
      continue;
    }
  }

  return {
    type: 'effect_declaration',
    name,
    duration,
    options,
    location,
  };
}

// ============================================================================
// External Function Declarations
// ============================================================================

/**
 * Parameter type for external functions
 */
export type ParameterType = 'string' | 'number' | 'boolean' | 'any';

/**
 * External function parameter
 */
export interface ExternalParameterNode {
  name: string;
  paramType: ParameterType;
  optional: boolean;
}

/**
 * External function declaration from @external directive
 * Example: @external playSound(id: string): void
 * Example: @external getUserName(): string
 */
export interface ExternalDeclarationNode {
  type: 'external_declaration';
  name: string;
  params: ExternalParameterNode[];
  returnType: ParameterType | 'void' | null;
  location: SourceSpan;
}

/**
 * Parse an @external declaration string
 * @param declaration - The declaration content after @external
 * @param location - Source location for error reporting
 * @returns Parsed ExternalDeclarationNode
 * @throws Error if declaration is invalid
 *
 * @example
 * parseExternalDeclaration('getUserName(): string')
 * parseExternalDeclaration('playSound(id: string)')
 * parseExternalDeclaration('log(message: string, level?: number)')
 */
export function parseExternalDeclaration(
  declaration: string,
  location: SourceSpan
): ExternalDeclarationNode {
  // Match: name(params): returnType or name(params)
  const match = declaration.match(
    /^\s*(\w+)\s*\(\s*(.*?)\s*\)\s*(?::\s*(\w+))?\s*$/
  );

  if (!match) {
    throw new Error(`Invalid @external declaration: ${declaration}`);
  }

  const [, name, paramsStr, returnType] = match;

  const params: ExternalParameterNode[] = [];

  if (paramsStr.trim()) {
    const paramParts = paramsStr.split(',');

    for (const part of paramParts) {
      const paramMatch = part.trim().match(/^(\w+)(\?)?\s*:\s*(\w+)$/);
      if (!paramMatch) {
        throw new Error(`Invalid parameter in declaration: ${part.trim()}`);
      }

      const [, paramName, optional, paramType] = paramMatch;

      if (!['string', 'number', 'boolean', 'any'].includes(paramType)) {
        throw new Error(`Invalid parameter type: ${paramType}`);
      }

      params.push({
        name: paramName,
        paramType: paramType as ParameterType,
        optional: optional === '?',
      });
    }
  }

  // Validate return type
  let validReturnType: ParameterType | 'void' | null = null;
  if (returnType) {
    if (!['string', 'number', 'boolean', 'any', 'void'].includes(returnType)) {
      throw new Error(`Invalid return type: ${returnType}`);
    }
    validReturnType = returnType as ParameterType | 'void';
  }

  return {
    type: 'external_declaration',
    name,
    params,
    returnType: validReturnType,
    location,
  };
}

// ============================================================================
// Timed Content Declarations
// ============================================================================

/**
 * Delay directive node for inline delayed content
 * Example: {@delay 2s} Content here {/}
 */
export interface DelayDirectiveNode {
  type: 'delay_directive';
  delay: number; // Milliseconds
  content: ContentNode[];
  location: SourceSpan;
}

/**
 * Every directive node for repeating content
 * Example: {@every 5s max:3} Repeating content {/}
 */
export interface EveryDirectiveNode {
  type: 'every_directive';
  interval: number; // Milliseconds
  maxFires: number; // 0 = unlimited
  content: ContentNode[];
  location: SourceSpan;
}

/**
 * Parse time duration string to milliseconds
 * @param timeStr - Time string like "500ms", "2s", "1.5s", "2000"
 * @returns Duration in milliseconds
 */
export function parseTimeString(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d+(?:\.\d+)?)(ms|s)?$/);
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }

  const [, num, unit] = match;
  let ms = parseFloat(num);

  if (unit === 's') {
    ms *= 1000;
  }
  // If no unit or 'ms', use as-is

  return ms;
}

/**
 * Parse a @delay directive string
 * @param declaration - The declaration content after @delay
 * @returns Parsed delay value in milliseconds
 *
 * @example
 * parseDelayDirective('2s')    // 2000
 * parseDelayDirective('500ms') // 500
 * parseDelayDirective('1000')  // 1000
 */
export function parseDelayDirective(declaration: string): { delay: number } {
  const delay = parseTimeString(declaration.trim());
  return { delay };
}

/**
 * Parse an @every directive string
 * @param declaration - The declaration content after @every
 * @returns Parsed interval and maxFires
 *
 * @example
 * parseEveryDirective('5s')          // { interval: 5000, maxFires: 0 }
 * parseEveryDirective('2s max:3')    // { interval: 2000, maxFires: 3 }
 * parseEveryDirective('1000 max:10') // { interval: 1000, maxFires: 10 }
 */
export function parseEveryDirective(
  declaration: string
): { interval: number; maxFires: number } {
  const parts = declaration.trim().split(/\s+/);

  if (parts.length === 0 || !parts[0]) {
    throw new Error(`Invalid @every declaration: ${declaration}`);
  }

  const interval = parseTimeString(parts[0]);
  let maxFires = 0; // 0 = unlimited

  // Look for max:N option
  for (let i = 1; i < parts.length; i++) {
    const maxMatch = parts[i].match(/^max[:\s]*(\d+)$/i);
    if (maxMatch) {
      maxFires = parseInt(maxMatch[1], 10);
    }
  }

  return { interval, maxFires };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a node is an audio declaration
 */
export function isAudioDeclaration(node: unknown): node is AudioDeclarationNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as { type: string }).type === 'audio_declaration'
  );
}

/**
 * Check if a node is an effect declaration
 */
export function isEffectDeclaration(node: unknown): node is EffectDeclarationNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as { type: string }).type === 'effect_declaration'
  );
}

/**
 * Check if a node is an external declaration
 */
export function isExternalDeclaration(node: unknown): node is ExternalDeclarationNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as { type: string }).type === 'external_declaration'
  );
}

/**
 * Check if a node is a delay directive
 */
export function isDelayDirective(node: unknown): node is DelayDirectiveNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as { type: string }).type === 'delay_directive'
  );
}

/**
 * Check if a node is an every directive
 */
export function isEveryDirective(node: unknown): node is EveryDirectiveNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as { type: string }).type === 'every_directive'
  );
}
