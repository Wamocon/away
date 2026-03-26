import { saveUserSettings, getUserSettings } from '../userSettings';

describe('userSettings lib', () => {
  it('should provide a function to save user settings', () => {
    expect(typeof saveUserSettings).toBe('function');
  });
  it('should provide a function to get user settings', () => {
    expect(typeof getUserSettings).toBe('function');
  });
});
