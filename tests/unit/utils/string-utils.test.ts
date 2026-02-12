import { describe, it, expect } from 'vitest';
import { slugify, parseCommaSeparated, unslugify } from '../../../src/utils/string-utils.js';

describe('string-utils', () => {
  describe('slugify', () => {
    it('should convert title case to kebab-case', () => {
      expect(slugify('Platform Engineering Team')).toBe('platform-engineering-team');
    });

    it('should lowercase all-caps', () => {
      expect(slugify('FRONTEND')).toBe('frontend');
    });

    it('should handle spaces', () => {
      expect(slugify('League Scheduler Team')).toBe('league-scheduler-team');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello! World@2026')).toBe('hello-world2026');
    });

    it('should replace underscores with hyphens', () => {
      expect(slugify('my_project_name')).toBe('my-project-name');
    });

    it('should collapse multiple hyphens', () => {
      expect(slugify('too---many---hyphens')).toBe('too-many-hyphens');
    });

    it('should trim leading/trailing hyphens', () => {
      expect(slugify('-leading-and-trailing-')).toBe('leading-and-trailing');
    });

    it('should handle empty string', () => {
      expect(slugify('')).toBe('');
    });

    it('should handle whitespace-only string', () => {
      expect(slugify('   ')).toBe('');
    });

    it('should handle mixed separators', () => {
      expect(slugify('  My_Project  Name  ')).toBe('my-project-name');
    });
  });

  describe('parseCommaSeparated', () => {
    it('should parse comma-separated values', () => {
      expect(parseCommaSeparated('Team A, Team B, Team C')).toEqual(['Team A', 'Team B', 'Team C']);
    });

    it('should trim whitespace', () => {
      expect(parseCommaSeparated('  a  ,  b  ,  c  ')).toEqual(['a', 'b', 'c']);
    });

    it('should handle no spaces', () => {
      expect(parseCommaSeparated('FRONTEND,BACKEND,QA')).toEqual(['FRONTEND', 'BACKEND', 'QA']);
    });

    it('should filter empty strings', () => {
      expect(parseCommaSeparated('a,,b,,c')).toEqual(['a', 'b', 'c']);
    });

    it('should handle single value', () => {
      expect(parseCommaSeparated('solo')).toEqual(['solo']);
    });

    it('should handle empty input', () => {
      expect(parseCommaSeparated('')).toEqual([]);
    });
  });

  describe('unslugify', () => {
    it('should convert kebab-case to title case', () => {
      expect(unslugify('platform-engineering-team')).toBe('Platform Engineering Team');
    });

    it('should handle single word', () => {
      expect(unslugify('frontend')).toBe('Frontend');
    });

    it('should handle all-caps segments', () => {
      expect(unslugify('API-GATEWAY')).toBe('Api Gateway');
    });

    it('should handle empty string', () => {
      expect(unslugify('')).toBe('');
    });
  });
});
