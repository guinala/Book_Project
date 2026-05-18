import { describe, it, expect } from 'vitest';
import { encodeKey, toWorkKey } from './bookPaths';

describe('encodeKey', () => {
  it('should extract the key from a full work path', () => {
    expect(encodeKey('/works/OL123W')).toBe('OL123W');
  });

  it('should return the input if no slash is present', () => {
    expect(encodeKey('OL123W')).toBe('OL123W');
  });

  it('should handle empty string', () => {
    expect(encodeKey('')).toBe('');
  });

  it('should handle path ending with slash', () => {
    expect(encodeKey('/works/')).toBe('');
  });

  it('should handle multiple slashes', () => {
    expect(encodeKey('/some/path/OL123W')).toBe('OL123W');
  });
});

describe('toWorkKey', () => {
  it('should prepend /works/ if not already present', () => {
    expect(toWorkKey('OL123W')).toBe('/works/OL123W');
  });

  it('should return the input if it already starts with /works/', () => {
    expect(toWorkKey('/works/OL123W')).toBe('/works/OL123W');
  });

  it('should handle empty string', () => {
    expect(toWorkKey('')).toBe('/works/');
  });

  it('should handle partial path', () => {
    expect(toWorkKey('/works/')).toBe('/works/');
  });
});