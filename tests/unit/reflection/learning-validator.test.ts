import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LearningValidator,
  validateLearning,
  createValidator,
  type ValidationInput,
} from '../../../src/core/reflection/learning-validator.js';

/**
 * Learning Validator Unit Tests
 *
 * Tests for the Agent SDK integration for reflect learnings
 */

describe('LearningValidator', () => {
  describe('constructor', () => {
    it('should create validator with default options', () => {
      const validator = new LearningValidator();
      expect(validator).toBeDefined();
    });

    it('should create validator with custom options', () => {
      const validator = new LearningValidator({
        enabled: false,
        model: 'claude-haiku-4-5-20251001',
        verbose: true,
      });
      expect(validator).toBeDefined();
    });
  });

  describe('validate (basic validation fallback)', () => {
    let validator: LearningValidator;

    beforeEach(() => {
      // Create validator without API key to test basic validation
      validator = new LearningValidator({ enabled: false });
    });

    it('should validate a good learning', async () => {
      const input: ValidationInput = {
        extractedRule: 'Always use TypeScript strict mode for better type safety',
        context: 'User corrected code to add strict: true',
        signalType: 'correction',
        targetSkill: 'frontend',
      };

      const result = await validator.validate(input);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.reasons).toContain('Passed basic validation');
    });

    it('should reject a rule that is too short', async () => {
      const input: ValidationInput = {
        extractedRule: 'Use this',
        context: 'Some context',
        signalType: 'rule',
        targetSkill: 'backend',
      };

      const result = await validator.validate(input);

      expect(result.isValid).toBe(false);
      expect(result.reasons).toContain('Too short (< 15 characters)');
    });

    it('should reject a rule without action verbs', async () => {
      const input: ValidationInput = {
        extractedRule: 'The button is blue and large',
        context: 'Some context',
        signalType: 'rule',
        targetSkill: 'frontend',
      };

      const result = await validator.validate(input);

      expect(result.isValid).toBe(false);
      expect(result.reasons).toContain('No action verb found');
    });

    it('should reject questions', async () => {
      const input: ValidationInput = {
        extractedRule: 'Should we always use TypeScript?',
        context: 'User asked a question',
        signalType: 'rule',
        targetSkill: 'frontend',
      };

      const result = await validator.validate(input);

      expect(result.isValid).toBe(false);
      expect(result.reasons).toContain('Contains question mark');
    });

    it('should reject truncated rules', async () => {
      const input: ValidationInput = {
        extractedRule: 'Always use the correct method for...',
        context: 'Truncated message',
        signalType: 'correction',
        targetSkill: 'backend',
      };

      const result = await validator.validate(input);

      expect(result.isValid).toBe(false);
      expect(result.reasons).toContain('Appears truncated');
    });

    it('should reject rules with gibberish patterns', async () => {
      const input: ValidationInput = {
        extractedRule: 'Use the asdf method to configure things',
        context: 'Typo in learning',
        signalType: 'correction',
        targetSkill: 'backend',
      };

      const result = await validator.validate(input);

      expect(result.isValid).toBe(false);
      expect(result.reasons).toContain('Contains potential typos/gibberish');
    });

    it('should extract triggers from valid rules', async () => {
      const input: ValidationInput = {
        extractedRule: 'Always run vitest tests before committing React components',
        context: 'User correction about testing',
        signalType: 'correction',
        targetSkill: 'testing',
      };

      const result = await validator.validate(input);

      expect(result.isValid).toBe(true);
      expect(result.triggers).toBeDefined();
      expect(result.triggers).toContain('vitest');
      expect(result.triggers).toContain('react');
      expect(result.triggers).toContain('test');
      expect(result.triggers).toContain('commit');
    });

    it('should detect multiple action patterns', async () => {
      const input: ValidationInput = {
        extractedRule: 'Prefer using async/await instead of callbacks for cleaner code',
        context: 'User preference',
        signalType: 'rule',
        targetSkill: 'backend',
      };

      const result = await validator.validate(input);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBe('high');
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple learnings', async () => {
      const validator = new LearningValidator({ enabled: false });

      const inputs: ValidationInput[] = [
        {
          extractedRule: 'Always use TypeScript for type safety',
          context: 'User correction',
          signalType: 'correction',
        },
        {
          extractedRule: 'Short',
          context: 'Too short',
          signalType: 'rule',
        },
      ];

      const results = await validator.validateBatch(inputs);

      expect(results.size).toBe(2);
      expect(results.get(inputs[0].extractedRule)?.isValid).toBe(true);
      expect(results.get(inputs[1].extractedRule)?.isValid).toBe(false);
    });
  });

  describe('areSimilar (basic)', () => {
    it('should detect exact matches', async () => {
      const validator = new LearningValidator({ enabled: false });

      const similar = await validator.areSimilar(
        'Always use TypeScript',
        'Always use TypeScript'
      );

      expect(similar).toBe(true);
    });

    it('should detect substring matches', async () => {
      const validator = new LearningValidator({ enabled: false });

      const similar = await validator.areSimilar(
        'Always use TypeScript strict mode',
        'Always use TypeScript'
      );

      expect(similar).toBe(true);
    });

    it('should detect high word overlap', async () => {
      const validator = new LearningValidator({ enabled: false });

      const similar = await validator.areSimilar(
        'Always prefer using async/await for cleaner code',
        'Prefer async/await for cleaner and more readable code'
      );

      expect(similar).toBe(true);
    });

    it('should not match unrelated strings', async () => {
      const validator = new LearningValidator({ enabled: false });

      const similar = await validator.areSimilar(
        'Always use TypeScript',
        'Deploy to Kubernetes with Helm'
      );

      expect(similar).toBe(false);
    });
  });

  describe('formatResult', () => {
    it('should format valid result', async () => {
      const validator = new LearningValidator({ enabled: false });

      const input: ValidationInput = {
        extractedRule: 'Always run tests before deploying',
        context: 'User rule',
        signalType: 'rule',
        targetSkill: 'testing',
      };

      const result = await validator.validate(input);
      const formatted = validator.formatResult(input, result);

      expect(formatted).toContain('✅');
      expect(formatted).toContain('Always run tests');
      expect(formatted).toContain('Triggers:');
    });

    it('should format invalid result', async () => {
      const validator = new LearningValidator({ enabled: false });

      const input: ValidationInput = {
        extractedRule: 'Short',
        context: 'Too short',
        signalType: 'rule',
      };

      const result = await validator.validate(input);
      const formatted = validator.formatResult(input, result);

      expect(formatted).toContain('❌');
      expect(formatted).toContain('Reasons:');
    });
  });
});

describe('validateLearning function', () => {
  it('should validate a learning with default settings', async () => {
    const result = await validateLearning(
      'Always use descriptive variable names for clarity',
      'User correction about naming',
      'correction',
      'coding'
    );

    expect(result).toBeDefined();
    expect(result.isValid).toBe(true);
  });
});

describe('createValidator function', () => {
  it('should create validator without config path', () => {
    const validator = createValidator();
    expect(validator).toBeDefined();
  });

  it('should create validator with non-existent config path', () => {
    const validator = createValidator('/nonexistent/config.json');
    expect(validator).toBeDefined();
  });
});

describe('Signal type handling', () => {
  let validator: LearningValidator;

  beforeEach(() => {
    validator = new LearningValidator({ enabled: false });
  });

  it('should handle correction signals', async () => {
    const input: ValidationInput = {
      extractedRule: 'Never commit directly to main branch',
      context: 'User said: "No, always use feature branches"',
      signalType: 'correction',
    };

    const result = await validator.validate(input);
    expect(result.isValid).toBe(true);
  });

  it('should handle rule signals', async () => {
    const input: ValidationInput = {
      extractedRule: 'Always add tests for new features',
      context: 'User established a rule',
      signalType: 'rule',
    };

    const result = await validator.validate(input);
    expect(result.isValid).toBe(true);
  });

  it('should handle approval signals', async () => {
    const input: ValidationInput = {
      extractedRule: 'Use the Button component from the design system',
      context: 'User approved the component usage',
      signalType: 'approval',
    };

    const result = await validator.validate(input);
    expect(result.isValid).toBe(true);
  });

  it('should handle prohibition signals', async () => {
    const input: ValidationInput = {
      extractedRule: 'Never use inline styles in React components',
      context: 'User prohibited inline styles',
      signalType: 'prohibition',
    };

    const result = await validator.validate(input);
    expect(result.isValid).toBe(true);
  });
});
