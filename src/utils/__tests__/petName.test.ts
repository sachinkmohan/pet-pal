import { normalizePetName } from '../petName';

describe('normalizePetName', () => {
  test('returns trimmed input', () => {
    expect(normalizePetName('  Pochi  ', 'Pochi')).toBe('Pochi');
  });

  test('falls back to default when input is empty', () => {
    expect(normalizePetName('', 'Pochi')).toBe('Pochi');
  });

  test('falls back to default when input is only whitespace', () => {
    expect(normalizePetName('   ', 'Mochi')).toBe('Mochi');
  });

  test('caps input at 12 characters', () => {
    expect(normalizePetName('Abcdefghijklmnop', 'Pochi')).toBe('Abcdefghijkl');
  });

  test('does not truncate names at or under 12 characters', () => {
    expect(normalizePetName('Exactly12Ch!', 'Pochi')).toBe('Exactly12Ch!');
  });
});
