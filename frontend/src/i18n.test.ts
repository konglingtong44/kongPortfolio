import { describe, expect, it, vi } from 'vitest';
import { initialLocale, rememberLocale, resolveLocale } from './i18n';

describe('language selection', () => {
  it.each([
    [null, ['ja-JP'], 'ja'], [null, ['zh-TW'], 'zh'], [null, ['en-US'], 'en'],
    [null, ['fr', 'zh-CN', 'en'], 'zh'], [null, ['fr'], 'ja'],
    [null, [], 'ja'], ['en', ['ja'], 'en'], ['invalid', ['zh'], 'zh'],
  ])('resolves saved=%s browser=%j to %s', (saved, browser, expected) => {
    expect(resolveLocale(saved, browser)).toBe(expected);
  });

  it('works when local storage is disabled', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => initialLocale()).not.toThrow();
    expect(() => rememberLocale('zh')).not.toThrow();
    get.mockRestore(); set.mockRestore();
  });
});
