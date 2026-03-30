import { describe, it, expect } from 'vitest';
import { LEGAL_LINK_ITEMS } from '@/components/legal/LegalLinks';

describe('Legal UI Constants', () => {
  it('should have all required legal link items', () => {
    const labels = LEGAL_LINK_ITEMS.map(item => item.label);
    const hrefs = LEGAL_LINK_ITEMS.map(item => item.href);

    expect(labels).toContain('Impressum');
    expect(labels).toContain('Datenschutz');
    expect(labels).toContain('AGB');

    expect(hrefs).toContain('/legal/impressum');
    expect(hrefs).toContain('/legal/datenschutz');
    expect(hrefs).toContain('/legal/agb');
  });

  it('should have exactly three items for the footer', () => {
    expect(LEGAL_LINK_ITEMS.length).toBe(3);
  });

  it('should have correct case and path structure', () => {
    LEGAL_LINK_ITEMS.forEach(item => {
      expect(item.href.startsWith('/legal/')).toBe(true);
      expect(item.label.length).toBeGreaterThan(2);
    });
  });
});
