import { describe, it, expect } from 'vitest';
import { renderFieldValue } from '../utils/formatters';

describe('renderFieldValue', () => {
  it('should return null for null or undefined', () => {
    expect(renderFieldValue(null)).toBe(null);
    expect(renderFieldValue(undefined)).toBe(null);
  });

  it('should render basic strings and numbers', () => {
    expect(renderFieldValue('Hello')).toBe('Hello');
    expect(renderFieldValue(123)).toBe('123');
  });

  it('should render booleans as Ja/Nein', () => {
    expect(renderFieldValue(true)).toBe('Ja');
    expect(renderFieldValue(false)).toBe('Nein');
  });

  it('should render single objects with a label', () => {
    expect(renderFieldValue({ label: 'Homeoffice', value: 'ho' })).toBe('Homeoffice');
  });

  it('should render arrays of checked items', () => {
    const value = [
      { id: '1', label: 'Dienstwagen', checked: true },
      { id: '2', label: 'Laptop', checked: false },
      { id: '3', label: 'Handy', checked: true }
    ];
    expect(renderFieldValue(value)).toBe('Dienstwagen, Handy');
  });

  it('should return null for arrays with no checked items', () => {
    const value = [
      { id: '1', label: 'Dienstwagen', checked: false }
    ];
    expect(renderFieldValue(value)).toBe(null);
  });

  it('should format ISO date strings', () => {
    expect(renderFieldValue('2024-12-24')).toBe('24.12.2024');
  });

  it('should handle non-standard objects gracefully', () => {
    expect(renderFieldValue({ foo: 'bar' })).toBe('[object Object]');
  });
});
