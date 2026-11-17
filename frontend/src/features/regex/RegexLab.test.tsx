import { expect, it } from 'vitest';
import { emailPattern, parsePattern } from './RegexLab';
it('parses the email example and preserves character classes and repetition', () => {
  const tree = parsePattern(emailPattern);
  expect(JSON.stringify(tree)).toContain('[A-Za-z0-9._%+-]');
  expect(JSON.stringify(tree)).toContain('{2,}');
  expect(new RegExp(emailPattern).test('hello@example.com')).toBe(true);
  expect(new RegExp(emailPattern).test('not-an-email')).toBe(false);
});
it('parses alternatives and optional groups while rejecting unsupported assertions', () => {
  const tree = JSON.stringify(parsePattern('^(cat|dog)s?$'));
  expect(tree).toContain('alt');
  expect(tree).toContain('"optional":true');
  expect(() => parsePattern('(?=a)a')).toThrow();
  expect(() => parsePattern('\\1')).toThrow();
});
