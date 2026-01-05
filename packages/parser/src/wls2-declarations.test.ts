import { describe, it, expect } from 'vitest';
import {
  parseAudioDeclaration,
  parseEffectDeclaration,
  parseExternalDeclaration,
  parseDelayDirective,
  parseEveryDirective,
  parseTimeString,
  isAudioDeclaration,
  isEffectDeclaration,
  isExternalDeclaration,
  isDelayDirective,
  isEveryDirective,
} from './wls2-declarations';
import type { SourceSpan } from './types';

const mockLocation: SourceSpan = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 10, offset: 9 },
};

describe('WLS 2.0 Declaration Parsing', () => {
  describe('parseAudioDeclaration', () => {
    it('should parse basic audio declaration', () => {
      const result = parseAudioDeclaration('bgm = "music/theme.mp3"', mockLocation);
      expect(result.type).toBe('audio_declaration');
      expect(result.id).toBe('bgm');
      expect(result.url).toBe('music/theme.mp3');
      expect(result.loop).toBe(false);
      expect(result.volume).toBe(1.0);
      expect(result.preload).toBe(false);
      expect(result.channel).toBe('bgm');
    });

    it('should parse audio declaration with loop', () => {
      const result = parseAudioDeclaration('bgm = "music/theme.mp3" loop', mockLocation);
      expect(result.loop).toBe(true);
    });

    it('should parse audio declaration with volume', () => {
      const result = parseAudioDeclaration('bgm = "music/theme.mp3" volume:0.7', mockLocation);
      expect(result.volume).toBe(0.7);
    });

    it('should parse audio declaration with preload', () => {
      const result = parseAudioDeclaration('bgm = "music/theme.mp3" preload', mockLocation);
      expect(result.preload).toBe(true);
    });

    it('should parse audio declaration with channel', () => {
      const result = parseAudioDeclaration('click = "sounds/click.wav" channel:sfx', mockLocation);
      expect(result.channel).toBe('sfx');
    });

    it('should parse audio declaration with all options', () => {
      const result = parseAudioDeclaration(
        'theme = "music/main.mp3" loop volume:0.5 channel:bgm preload',
        mockLocation
      );
      expect(result.id).toBe('theme');
      expect(result.url).toBe('music/main.mp3');
      expect(result.loop).toBe(true);
      expect(result.volume).toBe(0.5);
      expect(result.channel).toBe('bgm');
      expect(result.preload).toBe(true);
    });

    it('should handle whitespace variations', () => {
      const result = parseAudioDeclaration('  bgm  =  "test.mp3"  loop  ', mockLocation);
      expect(result.id).toBe('bgm');
      expect(result.url).toBe('test.mp3');
      expect(result.loop).toBe(true);
    });

    it('should throw on invalid declaration', () => {
      expect(() => parseAudioDeclaration('invalid', mockLocation)).toThrow(
        /Invalid @audio declaration/
      );
    });

    it('should throw on missing quotes', () => {
      expect(() => parseAudioDeclaration('bgm = test.mp3', mockLocation)).toThrow(
        /Invalid @audio declaration/
      );
    });
  });

  describe('parseEffectDeclaration', () => {
    it('should parse effect name only', () => {
      const result = parseEffectDeclaration('shake', mockLocation);
      expect(result.type).toBe('effect_declaration');
      expect(result.name).toBe('shake');
      expect(result.duration).toBeNull();
    });

    it('should parse effect with duration in ms', () => {
      const result = parseEffectDeclaration('shake 500ms', mockLocation);
      expect(result.name).toBe('shake');
      expect(result.duration).toBe(500);
    });

    it('should parse effect with duration in seconds', () => {
      const result = parseEffectDeclaration('fade-in 1s', mockLocation);
      expect(result.name).toBe('fade-in');
      expect(result.duration).toBe(1000);
    });

    it('should parse effect with numeric duration', () => {
      const result = parseEffectDeclaration('shake 500', mockLocation);
      expect(result.duration).toBe(500);
    });

    it('should parse effect with speed option', () => {
      const result = parseEffectDeclaration('typewriter speed:100', mockLocation);
      expect(result.name).toBe('typewriter');
      expect(result.options.speed).toBe(100);
    });

    it('should parse effect with delay option', () => {
      const result = parseEffectDeclaration('fade-in delay:500', mockLocation);
      expect(result.options.delay).toBe(500);
    });

    it('should parse effect with multiple options', () => {
      const result = parseEffectDeclaration('typewriter 2s speed:50 delay:100', mockLocation);
      expect(result.name).toBe('typewriter');
      expect(result.duration).toBe(2000);
      expect(result.options.speed).toBe(50);
      expect(result.options.delay).toBe(100);
    });

    it('should parse effect with easing option', () => {
      const result = parseEffectDeclaration('fade-in easing:ease-in-out', mockLocation);
      expect(result.options.easing).toBe('ease-in-out');
    });

    it('should throw on empty declaration', () => {
      expect(() => parseEffectDeclaration('', mockLocation)).toThrow(/Invalid @effect declaration/);
      expect(() => parseEffectDeclaration('   ', mockLocation)).toThrow(/Invalid @effect declaration/);
    });
  });

  describe('parseExternalDeclaration', () => {
    it('should parse function with no params and no return', () => {
      const result = parseExternalDeclaration('getUserName()', mockLocation);
      expect(result.type).toBe('external_declaration');
      expect(result.name).toBe('getUserName');
      expect(result.params).toHaveLength(0);
      expect(result.returnType).toBeNull();
    });

    it('should parse function with return type', () => {
      const result = parseExternalDeclaration('getUserName(): string', mockLocation);
      expect(result.name).toBe('getUserName');
      expect(result.returnType).toBe('string');
    });

    it('should parse function with one param', () => {
      const result = parseExternalDeclaration('playSound(id: string)', mockLocation);
      expect(result.name).toBe('playSound');
      expect(result.params).toHaveLength(1);
      expect(result.params[0].name).toBe('id');
      expect(result.params[0].paramType).toBe('string');
      expect(result.params[0].optional).toBe(false);
    });

    it('should parse function with multiple params', () => {
      const result = parseExternalDeclaration(
        'playSound(id: string, volume: number)',
        mockLocation
      );
      expect(result.params).toHaveLength(2);
      expect(result.params[0].name).toBe('id');
      expect(result.params[0].paramType).toBe('string');
      expect(result.params[1].name).toBe('volume');
      expect(result.params[1].paramType).toBe('number');
    });

    it('should parse function with optional param', () => {
      const result = parseExternalDeclaration('log(message: string, level?: number)', mockLocation);
      expect(result.params[0].optional).toBe(false);
      expect(result.params[1].optional).toBe(true);
    });

    it('should parse function with boolean param', () => {
      const result = parseExternalDeclaration('setFlag(flag: boolean)', mockLocation);
      expect(result.params[0].paramType).toBe('boolean');
    });

    it('should parse function with any param', () => {
      const result = parseExternalDeclaration('store(value: any)', mockLocation);
      expect(result.params[0].paramType).toBe('any');
    });

    it('should parse function with void return', () => {
      const result = parseExternalDeclaration('doSomething(): void', mockLocation);
      expect(result.returnType).toBe('void');
    });

    it('should throw on invalid declaration', () => {
      expect(() => parseExternalDeclaration('invalid', mockLocation)).toThrow(
        /Invalid @external declaration/
      );
    });

    it('should throw on invalid param format', () => {
      expect(() => parseExternalDeclaration('fn(badparam)', mockLocation)).toThrow(
        /Invalid parameter/
      );
    });

    it('should throw on invalid param type', () => {
      expect(() => parseExternalDeclaration('fn(x: object)', mockLocation)).toThrow(
        /Invalid parameter type/
      );
    });

    it('should throw on invalid return type', () => {
      expect(() => parseExternalDeclaration('fn(): object', mockLocation)).toThrow(
        /Invalid return type/
      );
    });
  });

  describe('parseTimeString', () => {
    it('should parse milliseconds', () => {
      expect(parseTimeString('500ms')).toBe(500);
      expect(parseTimeString('1500ms')).toBe(1500);
    });

    it('should parse seconds', () => {
      expect(parseTimeString('1s')).toBe(1000);
      expect(parseTimeString('2s')).toBe(2000);
      expect(parseTimeString('0.5s')).toBe(500);
    });

    it('should parse numeric value (assumed ms)', () => {
      expect(parseTimeString('500')).toBe(500);
      expect(parseTimeString('1000')).toBe(1000);
    });

    it('should handle whitespace', () => {
      expect(parseTimeString('  500ms  ')).toBe(500);
    });

    it('should throw on invalid format', () => {
      expect(() => parseTimeString('invalid')).toThrow(/Invalid time format/);
      expect(() => parseTimeString('')).toThrow(/Invalid time format/);
    });
  });

  describe('parseDelayDirective', () => {
    it('should parse delay in seconds', () => {
      const result = parseDelayDirective('2s');
      expect(result.delay).toBe(2000);
    });

    it('should parse delay in milliseconds', () => {
      const result = parseDelayDirective('500ms');
      expect(result.delay).toBe(500);
    });

    it('should parse numeric delay', () => {
      const result = parseDelayDirective('1000');
      expect(result.delay).toBe(1000);
    });
  });

  describe('parseEveryDirective', () => {
    it('should parse interval only', () => {
      const result = parseEveryDirective('5s');
      expect(result.interval).toBe(5000);
      expect(result.maxFires).toBe(0); // unlimited
    });

    it('should parse interval with max', () => {
      const result = parseEveryDirective('2s max:3');
      expect(result.interval).toBe(2000);
      expect(result.maxFires).toBe(3);
    });

    it('should parse numeric interval with max', () => {
      const result = parseEveryDirective('1000 max:10');
      expect(result.interval).toBe(1000);
      expect(result.maxFires).toBe(10);
    });

    it('should throw on empty declaration', () => {
      expect(() => parseEveryDirective('')).toThrow(/Invalid @every declaration/);
    });
  });

  describe('Type Guards', () => {
    it('isAudioDeclaration should identify audio declarations', () => {
      const audio = parseAudioDeclaration('bgm = "test.mp3"', mockLocation);
      expect(isAudioDeclaration(audio)).toBe(true);
      expect(isAudioDeclaration({ type: 'other' })).toBe(false);
      expect(isAudioDeclaration(null)).toBe(false);
    });

    it('isEffectDeclaration should identify effect declarations', () => {
      const effect = parseEffectDeclaration('shake', mockLocation);
      expect(isEffectDeclaration(effect)).toBe(true);
      expect(isEffectDeclaration({ type: 'other' })).toBe(false);
    });

    it('isExternalDeclaration should identify external declarations', () => {
      const ext = parseExternalDeclaration('test()', mockLocation);
      expect(isExternalDeclaration(ext)).toBe(true);
      expect(isExternalDeclaration({ type: 'other' })).toBe(false);
    });

    it('isDelayDirective should identify delay directives', () => {
      const delay = {
        type: 'delay_directive',
        delay: 1000,
        content: [],
        location: mockLocation,
      };
      expect(isDelayDirective(delay)).toBe(true);
      expect(isDelayDirective({ type: 'other' })).toBe(false);
    });

    it('isEveryDirective should identify every directives', () => {
      const every = {
        type: 'every_directive',
        interval: 1000,
        maxFires: 0,
        content: [],
        location: mockLocation,
      };
      expect(isEveryDirective(every)).toBe(true);
      expect(isEveryDirective({ type: 'other' })).toBe(false);
    });
  });
});
