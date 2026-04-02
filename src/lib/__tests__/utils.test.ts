import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cn } from '../utils';

describe('cn – className utility', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('filters falsy values', () => {
    expect(cn('a', false, undefined, null, '', 'b')).toBe('a b');
  });

  it('handles conditional classes', () => {
    const active = true;
    const disabled = false;
    expect(cn('base', active && 'active', disabled && 'disabled')).toBe('base active');
  });

  it('resolves Tailwind conflicts (last wins)', () => {
    // tailwind-merge resolves conflicts like p-2 / p-4
    const result = cn('p-2', 'p-4');
    expect(result).toBe('p-4');
  });

  it('handles objects as class arguments', () => {
    const result = cn({ 'text-red-500': true, 'text-blue-500': false });
    expect(result).toBe('text-red-500');
  });

  it('handles array inputs', () => {
    const result = cn(['a', 'b'], 'c');
    expect(result).toBe('a b c');
  });

  it('returns empty string with no valid inputs', () => {
    expect(cn()).toBe('');
    expect(cn(false, undefined, null)).toBe('');
  });

  it('merges Tailwind utility conflicts correctly', () => {
    // bg- conflict
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });
});
