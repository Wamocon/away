import { createVacationRequest, getVacationRequestsForOrg } from '../vacation';

describe('vacation lib', () => {
  it('should provide a function to create vacation request', () => {
    expect(typeof createVacationRequest).toBe('function');
  });
  it('should provide a function to get vacation requests for org', () => {
    expect(typeof getVacationRequestsForOrg).toBe('function');
  });
});
