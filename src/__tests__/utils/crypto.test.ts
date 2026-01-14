import { describe, expect, it } from '@jest/globals';
import '../setup';
import {
  generateRandomToken,
  hashToken,
  constantTimeCompare,
} from '../../utils/crypto';

describe('Crypto Utils', () => {
  describe('generateRandomToken', () => {
    it('should generate a random token with default length', () => {
      const token = generateRandomToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate tokens with custom byte length', () => {
      const token16 = generateRandomToken(16);
      const token64 = generateRandomToken(64);

      expect(token16.length).toBeLessThan(token64.length);
    });

    it('should generate unique tokens each time', () => {
      const token1 = generateRandomToken();
      const token2 = generateRandomToken();
      const token3 = generateRandomToken();

      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });

    it('should generate URL-safe base64 tokens', () => {
      const token = generateRandomToken();
      // URL-safe base64 should not contain +, /, or =
      expect(token).not.toMatch(/[+/=]/);
    });
  });

  describe('hashToken', () => {
    it('should generate a SHA-256 hash', () => {
      const input = 'test-token';
      const hash = hashToken(input);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      // SHA-256 produces 64 hex characters
      expect(hash.length).toBe(64);
    });

    it('should produce consistent hashes for same input', () => {
      const input = 'test-token';
      const hash1 = hashToken(input);
      const hash2 = hashToken(input);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashToken('token1');
      const hash2 = hashToken('token2');

      expect(hash1).not.toBe(hash2);
    });

    it('should only contain hexadecimal characters', () => {
      const hash = hashToken('test');
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('constantTimeCompare', () => {
    it('should return true for identical strings', () => {
      const str = 'test-string';
      expect(constantTimeCompare(str, str)).toBe(true);
    });

    it('should return false for different strings of same length', () => {
      expect(constantTimeCompare('test1', 'test2')).toBe(false);
    });

    it('should return false for different length strings', () => {
      expect(constantTimeCompare('short', 'longer string')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(constantTimeCompare('', '')).toBe(true);
      expect(constantTimeCompare('', 'non-empty')).toBe(false);
    });

    it('should handle special characters', () => {
      const special = 'test@#$%^&*()';
      expect(constantTimeCompare(special, special)).toBe(true);
    });

    it('should be case sensitive', () => {
      expect(constantTimeCompare('Test', 'test')).toBe(false);
    });
  });
});
