import { describe, it, expect } from 'vitest';
import { Choice } from './Choice';

describe('Choice', () => {
  describe('constructor', () => {
    it('should create a choice with required fields', () => {
      const choice = new Choice({
        text: 'Go left',
        target: 'left-room',
      });

      expect(choice.text).toBe('Go left');
      expect(choice.target).toBe('left-room');
      expect(choice.id).toBeTruthy();
      expect(choice.condition).toBeUndefined();
      expect(choice.action).toBeUndefined();
    });

    it('should create a choice with optional fields', () => {
      const choice = new Choice({
        text: 'Open door',
        target: 'next-room',
        condition: 'hasKey === true',
        action: 'hasKey = false',
      });

      expect(choice.condition).toBe('hasKey === true');
      expect(choice.action).toBe('hasKey = false');
    });

    it('should use provided id if given', () => {
      const choice = new Choice({
        id: 'custom-choice-id',
        text: 'Test',
        target: 'somewhere',
      });

      expect(choice.id).toBe('custom-choice-id');
    });

    it('should generate unique ids', () => {
      const choice1 = new Choice({ text: 'A', target: 'a' });
      const choice2 = new Choice({ text: 'B', target: 'b' });
      expect(choice1.id).not.toBe(choice2.id);
    });
  });

  describe('serialize/deserialize', () => {
    it('should serialize to ChoiceData', () => {
      const choice = new Choice({
        text: 'Attack',
        target: 'combat',
        condition: 'weapon !== null',
        action: 'enemyHealth -= 10',
      });

      const data = choice.serialize();
      expect(data.id).toBe(choice.id);
      expect(data.text).toBe('Attack');
      expect(data.target).toBe('combat');
      expect(data.condition).toBe('weapon !== null');
      expect(data.action).toBe('enemyHealth -= 10');
    });

    it('should deserialize from ChoiceData', () => {
      const data = {
        id: 'test-id',
        text: 'Run away',
        target: 'escape',
        condition: 'health < 20',
        action: 'coward = true',
      };

      const choice = Choice.deserialize(data);
      expect(choice.id).toBe('test-id');
      expect(choice.text).toBe('Run away');
      expect(choice.target).toBe('escape');
      expect(choice.condition).toBe('health < 20');
      expect(choice.action).toBe('coward = true');
    });

    it('should handle optional fields in deserialization', () => {
      const data = {
        id: 'minimal-id',
        text: 'Continue',
        target: 'next',
      };

      const choice = Choice.deserialize(data);
      expect(choice.condition).toBeUndefined();
      expect(choice.action).toBeUndefined();
    });
  });
});
