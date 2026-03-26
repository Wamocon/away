import { getUserRole } from '../roles';

describe('roles lib', () => {
  it('should provide a function to get user role', () => {
    expect(typeof getUserRole).toBe('function');
  });
});
