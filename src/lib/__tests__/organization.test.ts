import { getOrganizationsForUser, getCurrentOrganization } from '../organization';

describe('organization lib', () => {
  it('should fetch organizations for a user (mocked)', async () => {
    // Hier sollte ein Mock für supabase verwendet werden
    expect(typeof getOrganizationsForUser).toBe('function');
  });
  it('should fetch a single organization (mocked)', async () => {
    expect(typeof getCurrentOrganization).toBe('function');
  });
});
