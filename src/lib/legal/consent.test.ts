import { describe, it, expect } from 'vitest';
import { 
  createLegalConsentMetadata, 
  hasAcceptedAllLegalConsents, 
  LEGAL_CONSENT_VERSION,
  type LegalConsentState 
} from './consent';

describe('Legal Consent Logic', () => {
  it('should validate correctly when all consents are accepted', () => {
    const state: LegalConsentState = {
      termsAccepted: true,
      privacyAccepted: true,
      dsgvoAccepted: true
    };
    expect(hasAcceptedAllLegalConsents(state)).toBe(true);
  });

  it('should fail validation if any consent is missing', () => {
    const states: LegalConsentState[] = [
      { termsAccepted: false, privacyAccepted: true, dsgvoAccepted: true },
      { termsAccepted: true, privacyAccepted: false, dsgvoAccepted: true },
      { termsAccepted: true, privacyAccepted: true, dsgvoAccepted: false }
    ];

    states.forEach(state => {
      expect(hasAcceptedAllLegalConsents(state)).toBe(false);
    });
  });

  it('should create correct metadata with version and timestamp', () => {
    const state: LegalConsentState = {
      termsAccepted: true,
      privacyAccepted: true,
      dsgvoAccepted: true
    };
    
    const metadata = createLegalConsentMetadata(state);
    
    expect(metadata.legal_consent_version).toBe(LEGAL_CONSENT_VERSION);
    expect(metadata.terms_accepted).toBe(true);
    expect(metadata.privacy_accepted).toBe(true);
    expect(metadata.dsgvo_accepted).toBe(true);
    expect(metadata.legal_consents_accepted_at).toBeDefined();
    expect(new Date(metadata.legal_consents_accepted_at).getTime()).toBeGreaterThan(0);
  });
});
