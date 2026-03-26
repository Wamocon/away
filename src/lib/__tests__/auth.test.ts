import * as auth from '../auth';

describe('auth lib', () => {
  it('should export functions', () => {
    expect(typeof auth).toBe('object');
  });
});
